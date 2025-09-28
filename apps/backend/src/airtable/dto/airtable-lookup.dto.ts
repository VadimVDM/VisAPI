import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AirtableLookupDto {
  @ApiProperty({
    enum: ['email', 'orderid', 'phone'],
    description: 'Field to search by. Supported values: email, orderid, phone.',
    example: 'email',
  })
  @Transform(({ value }) => String(value || '').trim().toLowerCase())
  @IsString()
  @IsNotEmpty()
  @IsIn(['email', 'orderid', 'phone'])
  field!: 'email' | 'orderid' | 'phone';

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
