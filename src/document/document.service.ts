import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as ejs from 'ejs';
import * as fs from 'fs';
import * as path from 'path';
import { mkdirp } from 'mkdirp';
import dayjs from 'dayjs';

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

    // Ленивая загрузка puppeteer (если будете делать PDF)
    private async getPuppeteer() {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const puppeteer = require('puppeteer') as typeof import('puppeteer');
        return puppeteer;
    }

    getDocPdfPath(taskId: number, docId: number) {
        return path.join(this.outDir, `task-${taskId}`, `doc-${docId}.pdf`);
    }

    async renderSingleHtml(doc: {
        id: number;
        taskId: number;
        user: { id: number; firstName: string; lastName: string; email: string; role: string | null };
        content: Prisma.JsonValue;
    }) {
        const templatePath = path.join(this.templatesDir, 'task-document.ejs');
        const template = await fs.promises.readFile(templatePath, 'utf8');
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
            user: { id: number; firstName: string; lastName: string; email: string; role: string | null };
            content: Prisma.JsonValue;
        }>;
    }) {
        const templatePath = path.join(this.templatesDir, 'print-all.ejs');
        const template = await fs.promises.readFile(templatePath, 'utf8');

        const sections: string[] = [];
        for (const d of task.documents) {
            const single = await this.renderSingleHtml({
                id: d.id,
                taskId: task.id,
                user: d.user,
                content: d.content,
            });
            sections.push(single);
        }

        return ejs.render(template, {
            now: dayjs().format('YYYY-MM-DD HH:mm'),
            taskId: task.id,
            taskName: task.name,
            sections,
        });
    }

    async ensurePdfForDocument(doc: {
        id: number;
        taskId: number;
        user: { id: number; firstName: string; lastName: string; email: string; role: string | null };
        content: Prisma.JsonValue;
    }) {
        const pdfPath = this.getDocPdfPath(doc.taskId, doc.id);
        await mkdirp(path.dirname(pdfPath));

        try {
            await fs.promises.access(pdfPath, fs.constants.F_OK);
            return pdfPath;
        } catch { }

        const html = await this.renderSingleHtml(doc);

        try {
            const puppeteer = await this.getPuppeteer();
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
        } catch (e) {
            throw new InternalServerErrorException('Failed to generate PDF');
        }
    }
}