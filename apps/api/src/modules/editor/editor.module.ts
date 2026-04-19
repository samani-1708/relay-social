import { Module } from '@nestjs/common';
import { EditorController } from './editor.controller';
import { PostsModule } from '../posts/posts.module';

@Module({
  imports: [PostsModule],
  controllers: [EditorController],
})
export class EditorModule {}
