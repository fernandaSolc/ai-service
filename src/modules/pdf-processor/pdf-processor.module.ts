import { Module } from '@nestjs/common';
import { PdfProcessorService } from './pdf-processor.service';

@Module({
    providers: [PdfProcessorService],
    exports: [PdfProcessorService],
})
export class PdfProcessorModule { }
