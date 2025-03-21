// app/api/documents/[documentId]/versions/[versionId]/download/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prisma from "@/lib/prisma";
import { getFileFromStorage } from "@/lib/file-utils";

// GET /api/documents/[documentId]/versions/[versionId]/download
// Download a specific version of a document
export async function GET(
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

        // Get the version
        const version = await prisma.documentVersion.findUnique({
            where: {
                id: versionId,
                documentId,
            },
        });

        if (!version) {
            return NextResponse.json({ error: "Version not found" }, { status: 404 });
        }

        // Get the file from storage (implement this based on your storage solution)
        const fileBuffer = await getFileFromStorage(version.fileUrl);

        // Return the file as a download
        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Disposition': `attachment; filename="${version.fileName}"`,
                'Content-Type': version.fileType,
            },
        });
    } catch (error) {
        console.error("[VERSION_DOWNLOAD]", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';