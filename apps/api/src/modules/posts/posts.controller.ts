import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PostsService } from './posts.service';

@ApiTags('posts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  getPosts(
    @Request() req,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.postsService.getPosts(req.user.id, +page, +limit);
  }

  // Must be declared before :id to avoid "analytics" being treated as an ID
  @Get('analytics')
  getAnalytics(@Request() req) {
    return this.postsService.getAnalyticsSummary(req.user.id);
  }

  @Get(':id')
  getPostDetail(@Request() req, @Param('id') id: string) {
    return this.postsService.getPostDetail(req.user.id, id);
  }
}
