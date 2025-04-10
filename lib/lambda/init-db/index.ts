import * as mysql from 'mysql2/promise';
import { DatabaseAdapter } from '../util/database-adapter';
import { ISecretAdapter, MockSecretAdminAdapter, MockSecretUserx1Adapter } from '../util/secret-adapter';

const HOST_NAME = process.env.DB_HOST ? process.env.DB_HOST : 'localhost';
const SECRET_NAME = process.env.SECRET_NAME ? process.env.SECRET_NAME : 'fake-secret';

type QueryInput = {
    statement: string;
    replacements: string[];
}

type SecretItem = {
    username: string;
    password: string;
}

export interface IDatabaseUser extends mysql.RowDataPacket {
    user: string;
}


class Database {
    private adapter: DatabaseAdapter;
    constructor() {
        this.adapter = new DatabaseAdapter();
    }
    public async connect(host: string | undefined, username: string | undefined, password: string | undefined, database: string | undefined) {
        try {
            if (!host || !username || !password) {
                throw new Error('Invalid database connection parameters');
            }
            await this.adapter.connect(host, username, password, database);
            return;
        } catch (error) {
            console.error(error);
            throw new Error('Failed to connect to database  ');
        }
    }
    public async query<T extends mysql.QueryResult>(statement: string, replacements: string[]): Promise<T> {
        return await this.adapter.query<T>(statement, replacements);
    }
    public async close() {
        await this.adapter.close();
    }
}

class QueryStatement {
    public static createDatebase(database: string): QueryInput {
        const statement = `CREATE DATABASE IF NOT EXISTS ${database};`;
        return {
            statement,
            replacements: [database],
        };
    }
    public static getDatabase(database: string): QueryInput {
        const statement = `SHOW DATABASES LIKE ?;`;
        return {
            statement,
            replacements: [database],
        };
    }
    public static checkDatabaseExists(results: mysql.RowDataPacket[], database: string): void {
        const prop = `Database (${database})`;
        console.log(results);
        if (results.length === 1 && results[0][prop] === database) {
            return;
        }
        throw new Error('Failed to create database');
    }
    public static createUser(username: string, password: string): QueryInput {
        const statement
            = `CREATE USER IF NOT EXISTS ${username}@'%' IDENTIFIED BY ?;`;
        return {
            statement,
            // replacements: [username, password],
            replacements: [password],
        };
    }
    public static getUser(username: string): QueryInput {
        const statement
            = `SELECT user FROM mysql.user WHERE user = ?;`;
        return {
            statement,
            replacements: [username],
        };
    }
    public static checkUesrExists(results: IDatabaseUser[], username: string): void {
        if (results.length === 1 || results[0].user === username) {
            return;
        }
        throw new Error('Failed to create user');
    }
    public static grantPrivileges(username: string, database: string): QueryInput {
        const statement
            = `GRANT ALL PRIVILEGES ON ${database}.* TO ?@'%';`;
        return {
            statement,
            // replacements: [database, username],
            replacements: [username],
        };
    }
    public static getPrivileges(username: string): QueryInput {
        const statement
            = `SHOW GRANTS FOR ?@'%';`;
        return {
            statement,
            replacements: [username],
        };
    }   
    public static checkPrivilegesExists(results: mysql.RowDataPacket[], username: string, database: string): void {
        const prop = `Grants for ${username}@%`;
        if (results.length === 2 
            && results[0][prop] === `GRANT USAGE ON *.* TO \`${username}\`@\`%\`` 
            && results[1][prop] === `GRANT ALL PRIVILEGES ON \`${database}\`.* TO \`${username}\`@\`%\``) {
            return;
        }
        throw new Error('Failed to grant privileges');
    }
}

export class DbUserRepository {
    private readonly secretAdapter: ISecretAdapter;
    public username: string;
    public password: string;
    constructor(secretAdapter: ISecretAdapter) {
        this.secretAdapter = secretAdapter;
    }
    public async getUser(secretName: string | undefined): Promise<SecretItem> {
        if (!secretName) {
            throw new Error('Invalid secret name');
        }
        const secretItem = await this.secretAdapter.getSecret(secretName);
        if (!secretItem.username || !secretItem.password) {
            throw new Error('Invalid secret item');
        }
        this.username = secretItem.username;
        this.password = secretItem.password;
        return {username: this.username, password: this.password};
    }
}

export const initDatabase = async (dbName: string, userAdminRepository: DbUserRepository, newUserRepository: DbUserRepository) => {
    const secretAdminItem: SecretItem = await userAdminRepository.getUser(SECRET_NAME);
    const secretNewUserItem: SecretItem = await newUserRepository.getUser(SECRET_NAME);
    // dbName = secretNewUserItem.username; // dbName is now the username of the new user
    const db = new Database();

    try {
        await db.connect(HOST_NAME, secretAdminItem.username, secretAdminItem.password, undefined);

        const createDatabaseQuery = QueryStatement.createDatebase(dbName);
        await db.query(createDatabaseQuery.statement, createDatabaseQuery.replacements);
        const getDatabaseQuery = QueryStatement.getDatabase(dbName);
        const dbCreationResults = await db.query<mysql.RowDataPacket[]>(getDatabaseQuery.statement, createDatabaseQuery.replacements);
        QueryStatement.checkDatabaseExists(dbCreationResults, dbName);

        const createUserQuery = QueryStatement
            .createUser(secretNewUserItem.username, secretNewUserItem.password);
        await db.query(createUserQuery.statement, createUserQuery.replacements);
        const getUserQuery = QueryStatement.getUser(secretNewUserItem.username);
        const userCreationResults = await db.query<IDatabaseUser[]>(getUserQuery.statement, getUserQuery.replacements);
        QueryStatement.checkUesrExists(userCreationResults, secretNewUserItem.username);
        
        const grantPrivilegesQuery = QueryStatement
            .grantPrivileges(secretNewUserItem.username, dbName);
        await db.query(grantPrivilegesQuery.statement, grantPrivilegesQuery.replacements);
        const getPrivilegesQuery = QueryStatement.getPrivileges(secretNewUserItem.username);
        const privilegeResults = await db.query<mysql.RowDataPacket[]>(getPrivilegesQuery.statement, getPrivilegesQuery.replacements);
        QueryStatement.checkPrivilegesExists(privilegeResults, secretNewUserItem.username, dbName);
    } catch (error) {
        console.error(error);
        throw new Error('Failed to create database');
    } finally {
        await db.close();
    }
    return 0;
}

export const handler = async (event: any = {}): Promise<any> => {
  try {
    const userAdminRepository = new DbUserRepository(new MockSecretAdminAdapter());
    const newUserRepository = new DbUserRepository(new MockSecretUserx1Adapter());
    const dbName = 'mydb';
    await initDatabase(dbName, userAdminRepository, newUserRepository);
    return;
  } catch (error) {
    console.error(error);
    throw new Error('Failed to initialize database');
  }
};