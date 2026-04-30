import { useWorkspaceStore } from '@/store/workspaceStore'
import NewRequirementChat from './NewRequirementChat'
import RequirementOverview from './RequirementOverview'
import ConversationView from './ConversationView'
import WelcomeScreen from './WelcomeScreen'
import ProfilePanel from './ProfilePanel'
import SettingsPanel from './SettingsPanel'
import GeneralReqChat from './GeneralReqChat'

export default function MainPanel({ buyerRequirements, leadsByRequirement, sellerLeads }) {
  const { route } = useWorkspaceStore()

  switch (route.view) {
    case 'profile':         return <ProfilePanel />
    case 'settings':        return <SettingsPanel />
    case 'new_requirement': return <NewRequirementChat />
    case 'chat':            return <ConversationView leadId={route.leadId} />
    case 'general_chat': {
      const req = buyerRequirements.find(r => r.id === route.reqId)
      const leads = leadsByRequirement[route.reqId] || []
      return <GeneralReqChat req={req} leads={leads} />
    }
    case 'requirement': {
      const req = buyerRequirements.find(r => r.id === route.reqId)
      const leads = leadsByRequirement[route.reqId] || []
      return <RequirementOverview req={req} leads={leads} />
    }
    default: return <WelcomeScreen />
  }
}
