import {Global, Module} from '@nestjs/common';
import {WsUpgradeRouter} from './ws-upgrade.router.js';

@Global()
@Module({
  providers: [WsUpgradeRouter],
  exports: [WsUpgradeRouter],
})
export class WsUpgradeModule {}
