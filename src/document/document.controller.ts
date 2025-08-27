import { Controller, Get, Header, Param, ParseIntPipe, Res } from '@nestjs/common';
import type { Response } from 'express';
import * as fs from 'fs';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentRenderService } from './document.service';

@Controller()
export class DocumentController {
    constructor(
        private prisma: PrismaService,
        private renderer: DocumentRenderService,
    ) { }

    @Get('task-documents/:id/preview')
    @Header('Content-Type', 'text/html; charset=utf-8')
    async preview(@Param('id', ParseIntPipe) id: number): Promise<string> {
        const doc = await this.prisma.taskDocument.findUnique({
            where: { id },
            include: {
                task: { select: { id: true, name: true } },
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true,
                    },
                },
            },
        });
        if (!doc) return 'Not found';
        return this.renderer.renderSingleHtml({
            id: doc.id,
            taskId: doc.taskId,
            user: doc.user!,
            content: doc.content,
            printable: doc.printable,
        });
    }

    @Get('task-documents/:id/pdf')
    async pdf(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
        const doc = await this.prisma.taskDocument.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true,
                    },
                },
            },
        });
        if (!doc) {
            res.status(404).send('Not found');
            return;
        }
        if (!doc.printable) {
            res.status(403).send('PDF disabled for this document');
            return;
        }
        const pdfPath = await this.renderer.ensurePdfForDocument({
            id: doc.id,
            taskId: doc.taskId,
            user: doc.user!,
            content: doc.content,
            printable: doc.printable,
        });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `inline; filename="task-${doc.taskId}-doc-${doc.id}.pdf"`,
        );
        fs.createReadStream(pdfPath).pipe(res);
    }

    @Get('tasks/:taskId/print')
    @Header('Content-Type', 'text/html; charset=utf-8')
    async printAll(@Param('taskId', ParseIntPipe) taskId: number): Promise<string> {
        const task = await this.prisma.task.findUnique({
            where: { id: taskId },
            include: {
                documents: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                role: true,
                            },
                        },
                    },
                    orderBy: { id: 'asc' },
                },
            },
        });
        if (!task) return 'Not found';

        const printableDocs = task.documents.filter(d => d.printable);

        return this.renderer.renderPrintAllHtml({
            id: task.id,
            name: task.name,
            documents: printableDocs.map(d => ({
                id: d.id,
                user: d.user!,
                content: d.content,
                printable: d.printable,
            })),
        });
    }
}