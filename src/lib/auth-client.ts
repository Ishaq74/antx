import { createAuthClient } from "better-auth/client"
import { emailOTPClient, usernameClient,adminClient, organizationClient  } from "better-auth/client/plugins"

export const authClient = createAuthClient({
    plugins: [ 
        usernameClient(), emailOTPClient(), adminClient(), organizationClient()
    ] 
})