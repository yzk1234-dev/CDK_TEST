import * as mysql from 'mysql2/promise';

export class DatabaseAdapter {
    private connection: mysql.Connection;
    
    constructor() {}
    public async connect(host: string, username: string, password: string, database: string | undefined) {
        try {
            console.log(`Connecting to database (host: ${host}, username: ${username}, database: ${database})`);
            if (database) {
                this.connection = await mysql.createConnection({
                    host: host,
                    user: username,
                    password: password,
                    database: database,
                });
            } else {
                this.connection = await mysql.createConnection({
                    host: host,
                    user: username,
                    password: password,
                });
            }
        } catch (error) {
            console.error(error);
            throw new Error('Failed to connect to database');
        }
    }
    public async query<T extends mysql.QueryResult>(statement: string, replacements: string[]): Promise<T> {
        const [queryResult] = await this.connection.query<T>(statement, replacements)
        return queryResult;
    }
    public async close() {
        if (this.connection){
            await this.connection.end();
        }
    }
}
