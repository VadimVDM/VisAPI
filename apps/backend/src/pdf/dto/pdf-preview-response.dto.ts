import { ApiProperty } from '@nestjs/swagger';

export class PdfPreviewResponseDto {
  @ApiProperty({
    description: 'The base64 encoded PDF data or a URL to the PDF',
    example: 'JVBERi0xLjcNCiW...',
  })
  data: string;

  @ApiProperty({
    description: 'The format of the data',
    example: 'base64',
  })
  format: 'base64' | 'url';
}
