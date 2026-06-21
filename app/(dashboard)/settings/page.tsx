import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Card, CardHeader, CardTitle, CardBody, Button, Input } from '@/components/ui'
import { User, Shield, CreditCard, Bell } from 'lucide-react'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id

  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  return (
    <div className="settings-container">
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ marginBottom: '8px' }}>Settings</h1>
        <p style={{ color: 'var(--color-on-surface-variant)' }}>
          Manage your account preferences and billing.
        </p>
      </div>

      <div className="settings-grid">
        <Card>
          <CardHeader>
            <CardTitle>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={20} color="var(--color-primary)" />
                Profile Information
              </div>
            </CardTitle>
          </CardHeader>
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <Input label="Full Name" defaultValue={user?.displayName} />
              <Input label="Email Address" defaultValue={user?.email} disabled />
              <Button style={{ alignSelf: 'flex-start' }}>Save Changes</Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={20} color="var(--color-primary)" />
                Security
              </div>
            </CardTitle>
          </CardHeader>
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <Input label="Current Password" type="password" />
              <Input label="New Password" type="password" />
              <Button style={{ alignSelf: 'flex-start' }}>Update Password</Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={20} color="var(--color-primary)" />
                Subscription Plan
              </div>
            </CardTitle>
          </CardHeader>
          <CardBody>
            <div className="plan-info">
              <div>
                <h4 style={{ marginBottom: '4px' }}>Current Plan: <span style={{ textTransform: 'uppercase', color: 'var(--color-secondary)' }}>{user?.role}</span></h4>
                <p style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)' }}>
                  {user?.role === 'free' ? 'You are on the free tier with basic document processing.' : 'You have access to all premium features.'}
                </p>
              </div>
              {user?.role === 'free' && (
                <Button variant="outline">Upgrade to Pro</Button>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
             <CardTitle>
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={20} color="var(--color-primary)" />
                Notifications
              </div>
            </CardTitle>
          </CardHeader>
          <CardBody>
            <div className="notification-setting">
              <div>
                <h4 style={{ marginBottom: '4px' }}>Document Processing</h4>
                <p style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)' }}>Receive an email when your document has finished processing.</p>
              </div>
              <input type="checkbox" defaultChecked className="toggle" />
            </div>
            <div className="notification-setting" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--color-outline-variant)' }}>
              <div>
                <h4 style={{ marginBottom: '4px' }}>Expiry Warnings</h4>
                <p style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)' }}>Receive a warning 7 days before a document is automatically deleted.</p>
              </div>
              <input type="checkbox" defaultChecked className="toggle" />
            </div>
          </CardBody>
        </Card>
      </div>

      <style>{`
        .settings-container {
          max-width: 800px;
        }
        .settings-grid {
          display: grid;
          gap: 24px;
        }
        .plan-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background-color: var(--color-surface-container);
          border: 1px solid var(--color-outline-variant);
        }
        .notification-setting {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .toggle {
          width: 40px;
          height: 24px;
          appearance: none;
          background-color: var(--color-outline);
          border-radius: 12px;
          position: relative;
          cursor: pointer;
          outline: none;
        }
        .toggle:checked {
          background-color: var(--color-secondary);
        }
        .toggle::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          background-color: white;
          border-radius: 50%;
          transition: transform 0.2s;
        }
        .toggle:checked::after {
          transform: translateX(16px);
        }
      `}</style>
    </div>
  )
}
