import { PartialType } from '@nestjs/swagger';
import { SubmitPostDto } from './submit-post.dto';
export class UpdatePostDto extends PartialType(SubmitPostDto) {}
