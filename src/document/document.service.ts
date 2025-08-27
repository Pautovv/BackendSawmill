import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as ejs from 'ejs';
import * as fs from 'fs';
import * as path from 'path';
import { mkdirp } from 'mkdirp';
import dayjs from 'dayjs';

interface DocInput {
    id: number;
    taskId: number;
    user: {
        id: number;
        firstName: string | null;
        lastName: string | null;
        email: string | null;
        role: string | null;
    };
    content: Prisma.JsonValue;
    printable?: boolean;
}

@Injectable()
export class DocumentRenderService {
    private readonly envTemplatesDir = process.env.DOC_TEMPLATES_DIR;
    private readonly envOutDir = process.env.DOC_OUTPUT_DIR;

    private resolveTemplatesDir() {
        if (this.envTemplatesDir) return path.resolve(this.envTemplatesDir);
        const distPath = path.resolve(__dirname, 'resources', 'templates');
        if (fs.existsSync(distPath)) return distPath;
        return path.resolve(process.cwd(), 'resources', 'templates');
    }

    private resolveOutDir() {
        if (this.envOutDir) return path.resolve(this.envOutDir);
        return path.resolve(process.cwd(), 'storage', 'task-docs');
    }

    private templatesDir = this.resolveTemplatesDir();
    private outDir = this.resolveOutDir();

    private async loadTemplate(name: string) {
        const full = path.join(this.templatesDir, name);
        return fs.promises.readFile(full, 'utf8');
    }

    getDocPdfPath(taskId: number, docId: number) {
        return path.join(this.outDir, `task-${taskId}`, `doc-${docId}.pdf`);
    }

    async renderSingleHtml(doc: DocInput) {
        const template = await this.loadTemplate('task-document.ejs');
        const data = doc.content as any;
        return ejs.render(template, {
            now: dayjs().format('YYYY-MM-DD HH:mm'),
            documentId: doc.id,
            user: doc.user,
            task: data.task,
            techCard: data.techCard,
            steps: data.steps,
        });
    }

    async renderPrintAllHtml(task: {
        id: number;
        name: string;
        documents: Array<{
            id: number;
            user: {
                id: number;
                firstName: string | null;
                lastName: string | null;
                email: string | null;
                role: string | null;
            };
            content: Prisma.JsonValue;
            printable?: boolean;
        }>;
    }) {
        const wrapper = await this.loadTemplate('print-all.ejs');
        const sections: string[] = [];
        for (const d of task.documents) {
            const single = await this.renderSingleHtml({
                id: d.id,
                taskId: task.id,
                user: d.user,
                content: d.content,
                printable: d.printable,
            });
            sections.push(single);
        }
        return ejs.render(wrapper, {
            now: dayjs().format('YYYY-MM-DD HH:mm'),
            taskId: task.id,
            taskName: task.name,
            sections,
        });
    }

    async ensurePdfForDocument(doc: DocInput) {
        if (doc.printable === false) {
            throw new InternalServerErrorException('Document is not printable');
        }
        const pdfPath = this.getDocPdfPath(doc.taskId, doc.id);
        await mkdirp(path.dirname(pdfPath));
        try {
            await fs.promises.access(pdfPath, fs.constants.F_OK);
            return pdfPath;
        } catch { }

        const html = await this.renderSingleHtml(doc);

        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const puppeteer = require('puppeteer') as typeof import('puppeteer');
            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });
            await page.emulateMediaType('screen');
            await page.pdf({
                path: pdfPath,
                format: 'A4',
                printBackground: true,
                margin: { top: '15mm', right: '12mm', bottom: '15mm', left: '12mm' },
            });
            await browser.close();
            return pdfPath;
        } catch {
            throw new InternalServerErrorException('Failed to generate PDF');
        }
    }
}