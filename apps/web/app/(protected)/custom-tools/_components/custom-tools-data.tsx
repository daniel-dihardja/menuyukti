import { CustomToolsManager } from '@/app/(protected)/custom-tools/_components/custom-tools-manager'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  MY_WORKSPACE_WITH_API_ADAPTER_TOOLS_QUERY,
  type MyWorkspaceWithApiAdapterToolsData,
} from '@/lib/graphql/queries'

export async function CustomToolsData({ userId }: { userId: string }) {
  const data = await graphqlQuery<MyWorkspaceWithApiAdapterToolsData>(
    MY_WORKSPACE_WITH_API_ADAPTER_TOOLS_QUERY,
    undefined,
    userId,
    'MyWorkspaceWithApiAdapterTools',
  )
  const workspace = data.myWorkspace
  return (
    <CustomToolsManager
      initialTools={workspace?.apiAdapterTools ?? []}
      workspaceId={workspace?.id ?? null}
      workspaceName={workspace?.name ?? null}
    />
  )
}
