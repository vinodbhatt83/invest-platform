// app/api/documents/[documentId]/versions/[versionId]/restore/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// POST /api/documents/[documentId]/versions/[versionId]/restore
// Restore a previous version of a document
export async function POST(
    request: NextRequest,
    { params }: { params: { documentId: string; versionId: string } }
) {
    try {
        const { userId } = auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { documentId, versionId } = params;

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

        // Get the version to restore
        const versionToRestore = await prisma.documentVersion.findUnique({
            where: {
                id: versionId,
                documentId,
            },
        });

        if (!versionToRestore) {
            return NextResponse.json({ error: "Version not found" }, { status: 404 });
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

        // Create a new version from the restored file
        const newVersion = await prisma.documentVersion.create({
            data: {
                documentId,
                versionNumber: newVersionNumber,
                fileName: versionToRestore.fileName,
                fileSize: versionToRestore.fileSize,
                fileType: versionToRestore.fileType,
                fileUrl: versionToRestore.fileUrl,
                metadata: versionToRestore.metadata,
                comment: `Restored from version ${versionToRestore.versionNumber}`,
                createdById: userId,
                changes: `Restored to version ${versionToRestore.versionNumber}`,
            },
        });

        // Update the document with the restored file details
        await prisma.document.update({
            where: {
                id: documentId,
            },
            data: {
                fileName: versionToRestore.fileName,
                fileSize: versionToRestore.fileSize,
                fileType: versionToRestore.fileType,
                fileUrl: versionToRestore.fileUrl,
                currentVersionId: newVersion.id,
                currentVersionNumber: newVersionNumber,
            },
        });

        revalidatePath(`/documents/${documentId}`);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[DOCUMENT_VERSION_RESTORE]", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';