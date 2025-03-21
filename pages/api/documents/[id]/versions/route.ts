// app/api/documents/[documentId]/versions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getFileType, getFileMetadata } from "@/lib/file-utils";

// GET /api/documents/[documentId]/versions
// Retrieve all versions of a document
export async function GET(
    request: NextRequest,
    { params }: { params: { documentId: string } }
) {
    try {
        const { userId } = auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const documentId = params.documentId;

        // First check if the user has access to this document
        const document = await prisma.document.findFirst({
            where: {
                id: documentId,
                workspace: {
                    members: {
                        some: {
                            userId,
                        },
                    },
                },
            },
        });

        if (!document) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        // Get all versions
        const versions = await prisma.documentVersion.findMany({
            where: {
                documentId,
            },
            orderBy: {
                versionNumber: "desc",
            },
            include: {
                createdBy: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        // Transform the response
        const formattedVersions = versions.map((version) => ({
            id: version.id,
            documentId: version.documentId,
            versionNumber: version.versionNumber,
            fileName: version.fileName,
            fileSize: version.fileSize,
            fileType: version.fileType,
            fileUrl: version.fileUrl,
            createdAt: version.createdAt,
            createdBy: version.createdBy.name,
            metadata: version.metadata,
            comment: version.comment,
            changes: version.changes,
        }));

        return NextResponse.json(formattedVersions);
    } catch (error) {
        console.error("[DOCUMENT_VERSIONS_GET]", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

// POST /api/documents/[documentId]/versions
// Create a new version of a document from an uploaded file
export async function POST(
    request: NextRequest,
    { params }: { params: { documentId: string } }
) {
    try {
        const { userId } = auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const documentId = params.documentId;

        // Handle multipart form data for file upload
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const comment = formData.get('comment') as string;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Check if the user has access to this document
        const document = await prisma.document.findFirst({
            where: {
                id: documentId,
                workspace: {
                    members: {
                        some: {
                            userId,
                        },
                    },
                },
            },
        });

        if (!document) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        // Get the latest version number
        const latestVersion = await prisma.documentVersion.findFirst({
            where: {
                documentId,
            },
            orderBy: {
                versionNumber: "desc",
            },
        });

        const newVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

        // Upload the file to storage (this is a placeholder - implement your storage solution)
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const fileName = file.name;
        const fileType = getFileType(file.type, fileName);
        const fileSize = file.size;

        // Get file metadata (implement this based on file type)
        const metadata = await getFileMetadata(fileBuffer, fileType);

        // Store the file in your storage solution (example with S3)
        // const fileUrl = await uploadToS3(fileBuffer, `documents/${documentId}/versions/${newVersionNumber}/${fileName}`);

        // For this placeholder, we'll just use a dummy URL
        const fileUrl = `/api/documents/${documentId}/versions/${newVersionNumber}/download`;

        // Detect changes between versions (implement based on file type)
        let changes = "New version";
        if (latestVersion) {
            // For text files, you could compare content
            // For binary files, compare size, metadata, etc.
            if (latestVersion.fileSize !== fileSize) {
                const sizeDiff = fileSize - latestVersion.fileSize;
                changes = sizeDiff > 0
                    ? `File size increased by ${formatBytes(sizeDiff)}`
                    : `File size decreased by ${formatBytes(Math.abs(sizeDiff))}`;
            }
        } else {
            changes = "Initial version";
        }

        // Create the new version
        const newVersion = await prisma.documentVersion.create({
            data: {
                documentId,
                versionNumber: newVersionNumber,
                fileName,
                fileSize,
                fileType,
                fileUrl,
                metadata,
                comment: comment || null,
                createdById: userId,
                changes,
            },
            include: {
                createdBy: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        // Update the document with the latest version info
        await prisma.document.update({
            where: {
                id: documentId,
            },
            data: {
                fileName,
                fileSize,
                fileType,
                fileUrl,
                currentVersionId: newVersion.id,
                currentVersionNumber: newVersionNumber,
            },
        });

        // Format the response
        const formattedVersion = {
            id: newVersion.id,
            documentId: newVersion.documentId,
            versionNumber: newVersion.versionNumber,
            fileName: newVersion.fileName,
            fileSize: newVersion.fileSize,
            fileType: newVersion.fileType,
            fileUrl: newVersion.fileUrl,
            createdAt: newVersion.createdAt,
            createdBy: newVersion.createdBy.name,
            metadata: newVersion.metadata,
            comment: newVersion.comment,
            changes: newVersion.changes,
        };

        revalidatePath(`/documents/${documentId}`);

        return NextResponse.json(formattedVersion);
    } catch (error) {
        console.error("[DOCUMENT_VERSIONS_POST]", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

// Helper function to format bytes
function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export const dynamic = 'force-dynamic';