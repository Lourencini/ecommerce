import {
    Controller,
    Post,
    UploadedFiles,
    UseInterceptors,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, resolve } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { mkdirSync } from 'fs';

const UPLOADS_DIR = resolve(process.cwd(), 'uploads', 'products');
mkdirSync(UPLOADS_DIR, { recursive: true });

@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
    @Post()
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(
        FilesInterceptor('files', 10, {
            storage: diskStorage({
                destination: UPLOADS_DIR,
                filename: (req, file, callback) => {
                    const uniqueSuffix = uuidv4();
                    callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
                },
            }),
            fileFilter: (req, file, callback) => {
                if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/)) {
                    return callback(new Error('Apenas imagens são permitidas!'), false);
                }
                callback(null, true);
            },
            limits: {
                fileSize: 5 * 1024 * 1024, // 5MB
            },
        }),
    )
    @ApiOperation({ summary: 'Fazer upload de múltiplas imagens' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                files: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                },
            },
        },
    })
    uploadFiles(@UploadedFiles() files: Express.Multer.File[]) {
        const fileUrls = files.map((file) => `/uploads/products/${file.filename}`);
        return { urls: fileUrls };
    }
}
