const { Client } = require('pg')

const client = new Client({
    connectionString: 'postgresql://postgres:Database%401234@db.frzsymaabkcqaqbajetg.supabase.co:5432/postgres',
    ssl: {
        rejectUnauthorized: false
    }
});

async function testConnection() {
    try {
        await client.connect()
        console.log('Connection successful')
        await client.end()
    } catch (error) {
        console.error('Connection failed:', error)
    }
}

testConnection()