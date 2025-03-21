import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting to seed database...');

    // Create admin user
    const adminPassword = await hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@invest.com' },
        update: {},
        create: {
            email: 'admin@invest.com',
            name: 'Admin User',
            password: adminPassword,
            roles: {
                create: {
                    role: 'ADMIN',
                },
            },
        },
    });
    console.log('Created admin user:', admin.email);

    // Create default target systems
    const invoiceSystem = await prisma.targetSystem.upsert({
        where: { id: 'invoice-system' },
        update: {},
        create: {
            id: 'invoice-system',
            name: 'Invoice Processing System',
            description: 'System for processing invoice data',
            fields: {
                create: [
                    {
                        name: 'Invoice Number',
                        description: 'Unique invoice identifier',
                        required: true,
                        type: 'text',
                    },
                    {
                        name: 'Invoice Date',
                        description: 'Date when the invoice was issued',
                        required: true,
                        type: 'date',
                    },
                    {
                        name: 'Due Date',
                        description: 'Date when payment is due',
                        required: false,
                        type: 'date',
                    },
                    {
                        name: 'Vendor Name',
                        description: 'Name of the vendor',
                        required: true,
                        type: 'text',
                    },
                    {
                        name: 'Vendor Address',
                        description: 'Address of the vendor',
                        required: false,
                        type: 'text',
                    },
                    {
                        name: 'Total Amount',
                        description: 'Total invoice amount',
                        required: true,
                        type: 'number',
                    },
                    {
                        name: 'Tax Amount',
                        description: 'Total tax amount',
                        required: false,
                        type: 'number',
                    },
                    {
                        name: 'Currency',
                        description: 'Currency used in invoice',
                        required: false,
                        type: 'enum',
                        options: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'],
                    },
                    {
                        name: 'Status',
                        description: 'Status of the invoice',
                        required: false,
                        type: 'enum',
                        options: ['Pending', 'Paid', 'Overdue', 'Cancelled'],
                    },
                ],
            },
        },
    });
    console.log('Created target system:', invoiceSystem.name);

    const crm = await prisma.targetSystem.upsert({
        where: { id: 'crm-system' },
        update: {},
        create: {
            id: 'crm-system',
            name: 'Customer Relationship Management',
            description: 'CRM system for customer data',
            fields: {
                create: [
                    {
                        name: 'Customer ID',
                        description: 'Unique customer identifier',
                        required: true,
                        type: 'text',
                    },
                    {
                        name: 'First Name',
                        description: 'Customer first name',
                        required: true,
                        type: 'text',
                    },
                    {
                        name: 'Last Name',
                        description: 'Customer last name',
                        required: true,
                        type: 'text',
                    },
                    {
                        name: 'Email',
                        description: 'Customer email address',
                        required: true,
                        type: 'text',
                    },
                    {
                        name: 'Phone',
                        description: 'Customer phone number',
                        required: false,
                        type: 'text',
                    },
                    {
                        name: 'Address',
                        description: 'Customer address',
                        required: false,
                        type: 'text',
                    },
                    {
                        name: 'Customer Type',
                        description: 'Type of customer',
                        required: false,
                        type: 'enum',
                        options: ['Individual', 'Business', 'Government', 'Non-profit'],
                    },
                ],
            },
        },
    });
    console.log('Created target system:', crm.name);

    // Create sample mapping templates
    const invoiceTemplate = await prisma.mappingTemplate.upsert({
        where: { id: 'standard-invoice-template' },
        update: {},
        create: {
            id: 'standard-invoice-template',
            name: 'Standard Invoice Template',
            description: 'Default mapping for common invoice formats',
            targetSystemId: invoiceSystem.id,
            fields: {
                create: [
                    {
                        targetFieldId: (await prisma.targetField.findFirst({
                            where: { targetSystemId: invoiceSystem.id, name: 'Invoice Number' },
                        }))!.id,
                        extractedFieldName: 'Invoice Number',
                    },
                    {
                        targetFieldId: (await prisma.targetField.findFirst({
                            where: { targetSystemId: invoiceSystem.id, name: 'Invoice Date' },
                        }))!.id,
                        extractedFieldName: 'Date',
                    },
                    {
                        targetFieldId: (await prisma.targetField.findFirst({
                            where: { targetSystemId: invoiceSystem.id, name: 'Vendor Name' },
                        }))!.id,
                        extractedFieldName: 'Vendor',
                    },
                    {
                        targetFieldId: (await prisma.targetField.findFirst({
                            where: { targetSystemId: invoiceSystem.id, name: 'Total Amount' },
                        }))!.id,
                        extractedFieldName: 'Total Amount',
                    },
                ],
            },
        },
    });
    console.log('Created mapping template:', invoiceTemplate.name);

    console.log('Seeding completed.');
}

main()
    .catch((e) => {
        console.error('Error during seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });