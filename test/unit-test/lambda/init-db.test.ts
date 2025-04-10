import { DbUserRepository, initDatabase, 
    IDatabaseUser} from "../../../lib/lambda/init-db";
import { MockSecretAdminAdapter, MockSecretUserx1Adapter } from "../../../lib/lambda/util/secret-adapter";
import * as mysql from 'mysql2/promise';

interface IDatabaseDb extends mysql.RowDataPacket {
    "Database(mydb)": string;
}

interface IPrivilege extends mysql.RowDataPacket {
    "Grants for userx1@%": string;
}

describe('initDatabase', () => {
    const HOST_NAME = 'localhost';
    const SECRET_NAME = 'fake-secret-name';
    it('should return a database connection', async () => {
        // Arrange
        const secretAdapter = new MockSecretAdminAdapter();
        const userAdominRepository = new DbUserRepository(secretAdapter);
        const newUserRepository = new DbUserRepository(new MockSecretUserx1Adapter());
        const dbName = 'mydb';

        // Act
        const result = await initDatabase(dbName, userAdominRepository, newUserRepository);

        // Assert
        expect(result).toEqual(0)
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '1313',
        });
        const [userRows] = await connection.query<IDatabaseUser[]>(
            "SELECT user FROM mysql.user WHERE user = ?;", 
            ['userx1']
        );
        const [databaseRows] = await connection.query<IDatabaseDb[]>(
            "SHOW DATABASES LIKE ?;",
            ['mydb']
        );
        const [privilegeRows] = await connection.query<IPrivilege[]>(
            "SHOW GRANTS FOR userx1@'%';"
        );
        connection.end();
        console.log(privilegeRows);
        console.log(databaseRows);
        expect(userRows.length).toEqual(1);
        expect(userRows[0].user).toEqual('userx1');
        expect(databaseRows.length).toEqual(1);
        expect(databaseRows[0]["Database (mydb)"]).toEqual('mydb');
        expect(privilegeRows.length).toEqual(2);
        expect(privilegeRows[0]['Grants for userx1@%']).toEqual(
            "GRANT USAGE ON *.* TO `userx1`@`%`" // USAGE is the default privilege (sinoniem for no privileges)
        );
        expect(privilegeRows[1]['Grants for userx1@%']).toEqual(
            "GRANT ALL PRIVILEGES ON `mydb`.* TO `userx1`@`%`"
        );
    });
});