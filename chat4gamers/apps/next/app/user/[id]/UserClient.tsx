'use client'
import { UserDetailScreen } from 'app/features/user/detail-screen'
import { useParams } from 'solito/navigation'

export default function UserClient() {
  const { id } = useParams()
  return <UserDetailScreen id={id as string} />
}