import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AirtableLookupDto {
  @ApiProperty({
    enum: ['email', 'orderid', 'phone'],
    description: 'Field to search by. Supported values: email, orderid, phone.',
    example: 'email',
  })
  @Transform(({ value }) =>
    String(value || '')
      .trim()
      .toLowerCase(),
  )
  @IsString()
  @IsNotEmpty()
  @IsIn(['email', 'orderid', 'phone'])
  field!: 'email' | 'orderid' | 'phone';

  @ApiProperty({
    description: 'Value to look up in Airtable using the specified field.',
    example: 'customer@example.com',
  })
  @Transform(({ value }) => {
    const trimmed = String(value || '').trim();
    // Return undefined instead of empty string to trigger @IsNotEmpty validation
    return trimmed === '' ? undefined : trimmed;
  })
  @IsString()
  @IsNotEmpty({
    message:
      'The key field cannot be empty. Please provide a value to search for.',
  })
  @MaxLength(200)
  key!: string;
}
