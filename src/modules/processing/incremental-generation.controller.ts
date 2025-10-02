import { Controller, Post, Get, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { IncrementalGenerationService } from './incremental-generation.service';
import { CreateChapterDto, ContinueChapterDto, ChapterResponseDto } from './dto/create-chapter.dto';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

@ApiTags('Geração Incremental de Cursos')
@Controller('v1/incremental')
@UseGuards(ApiKeyGuard)
@ApiBearerAuth('api-key')
export class IncrementalGenerationController {
  constructor(
    private readonly incrementalGenerationService: IncrementalGenerationService,
  ) { }

  @Post('create-chapter')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar novo capítulo',
    description: 'Cria um novo capítulo para um curso usando IA, com geração incremental e controle total sobre o processo.'
  })
  @ApiResponse({
    status: 201,
    description: 'Capítulo criado com sucesso',
    type: ChapterResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos'
  })
  @ApiResponse({
    status: 503,
    description: 'Serviço indisponível'
  })
  async createChapter(@Body() createChapterDto: CreateChapterDto): Promise<ChapterResponseDto> {
    return this.incrementalGenerationService.createChapter(createChapterDto);
  }

  @Post('continue-chapter')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Continuar/expandir capítulo',
    description: 'Expande ou continua um capítulo existente, adicionando mais conteúdo, seções ou atividades.'
  })
  @ApiResponse({
    status: 200,
    description: 'Capítulo continuado com sucesso',
    type: ChapterResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Capítulo não encontrado'
  })
  async continueChapter(@Body() continueChapterDto: ContinueChapterDto): Promise<ChapterResponseDto> {
    return this.incrementalGenerationService.continueChapter(continueChapterDto);
  }

  @Get('course/:courseId/chapters')
  @ApiOperation({
    summary: 'Listar capítulos do curso',
    description: 'Retorna todos os capítulos de um curso específico.'
  })
  @ApiParam({ name: 'courseId', description: 'ID do curso' })
  @ApiResponse({
    status: 200,
    description: 'Lista de capítulos',
    type: [ChapterResponseDto]
  })
  async getCourseChapters(@Param('courseId') courseId: string): Promise<ChapterResponseDto[]> {
    return this.incrementalGenerationService.getCourseChapters(courseId);
  }

  @Get('chapter/:chapterId')
  @ApiOperation({
    summary: 'Obter capítulo específico',
    description: 'Retorna um capítulo específico com todos os seus detalhes.'
  })
  @ApiParam({ name: 'chapterId', description: 'ID do capítulo' })
  @ApiResponse({
    status: 200,
    description: 'Capítulo encontrado',
    type: ChapterResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Capítulo não encontrado'
  })
  async getChapter(@Param('chapterId') chapterId: string): Promise<ChapterResponseDto> {
    return this.incrementalGenerationService.getChapter(chapterId);
  }


  @Get('philosophy')
  @ApiOperation({
    summary: 'Obter filosofia pedagógica padrão',
    description: 'Retorna a filosofia pedagógica padrão que será aplicada a todos os cursos.'
  })
  @ApiResponse({
    status: 200,
    description: 'Filosofia pedagógica',
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string' },
        values: { type: 'array', items: { type: 'string' } },
        principles: { type: 'array', items: { type: 'string' } }
      }
    }
  })
  async getPhilosophy(): Promise<any> {
    return {
      content: 'Educação inclusiva e acessível para todos os estudantes, com foco no desenvolvimento do pensamento crítico, criatividade e inovação. Promover o aprendizado como ferramenta de transformação social e econômica, especialmente em regiões em desenvolvimento como o Maranhão.',
      values: ['inclusão', 'qualidade', 'inovação', 'desenvolvimento regional', 'pensamento crítico'],
      principles: [
        'Aprendizado ativo e participativo',
        'Contextualização regional',
        'Desenvolvimento de competências',
        'Acessibilidade universal',
        'Inovação pedagógica'
      ]
    };
  }
}
