import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AirtableLookupDto {
  @ApiProperty({
    enum: ['email', 'orderid'],
    description: 'Field to search by. Supported values: email, orderid.',
    example: 'email',
  })
  @Transform(({ value }) => String(value || '').trim().toLowerCase())
  @IsString()
  @IsNotEmpty()
  @IsIn(['email', 'orderid'])
  field!: 'email' | 'orderid';

  @ApiProperty({
    description: 'Value to look up in Airtable using the specified field.',
    example: 'customer@example.com',
  })
  @Transform(({ value }) => String(value || '').trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  key!: string;
}
