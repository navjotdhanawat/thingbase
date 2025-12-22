import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserPayload {
  id: string;
  tenantId: string;
  email: string;
  role: 'admin' | 'user';
  tenant?: {
    id: string;
    name: string;
    slug: string;
    plan: string;
  };
}

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CurrentUserPayload;

    if (data) {
      return user?.[data];
    }

    return user;
  },
);


