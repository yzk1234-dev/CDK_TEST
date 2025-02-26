export interface ISecretAdapter {
    secretItem: Record<string, any>;
    getSecret(secretName: string): Promise<Record<string, any>>;
}

export class MockSecretAdminAdapter implements ISecretAdapter {
    public secretItem: Record<string, any>;
    constructor() {}
    public async getSecret(secretName: string): Promise<Record<string, any>> {
        this.secretItem = {
            username: 'root',
            password: '1313',
        };
        return this.secretItem;
    }
}

export class MockSecretUserx1Adapter implements ISecretAdapter {
    public secretItem: Record<string, any>;
    constructor() {}
    public async getSecret(secretName: string): Promise<Record<string, any>> {
        this.secretItem = {
            username: 'userx1',
            password: '1313',
        };
        return this.secretItem;
    }
}