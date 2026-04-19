import { Module } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { OAuthCallbackController } from './oauth-callback.controller';
import { AccountsService } from './accounts.service';
import { OAuthService } from './oauth.service';
import { TokenRefreshService } from './token-refresh.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { OAuthStateService } from '../../common/services/oauth-state.service';

@Module({
  controllers: [AccountsController, OAuthCallbackController],
  providers: [AccountsService, OAuthService, TokenRefreshService, EncryptionService, OAuthStateService],
  exports: [AccountsService, OAuthService, TokenRefreshService, EncryptionService],
})
export class AccountsModule {}
