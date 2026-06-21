'use client'

import { useRouter } from 'next/navigation'
import { MessageSquarePlus } from 'lucide-react'
import { useSession } from 'next-auth/react'

export function NewChatButton(): React.JSX.Element {
  const router = useRouter()
  const { data: session } = useSession()

  const handleNewChat = () => {
    if (!session?.user) return
    router.push('/chat')
  }

  return (
    <button onClick={handleNewChat} className="new-chat-btn" aria-label="New chat">
      <MessageSquarePlus size={20} aria-hidden="true" />
      <span>New Chat</span>
    </button>
  )
}
