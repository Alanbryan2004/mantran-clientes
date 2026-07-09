import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function Layout() {
  return (
    <div className="flex h-screen bg-dark-bg text-dark-text">
      <Sidebar />
      <main className="flex-1 overflow-hidden bg-dark-bg p-8 flex flex-col min-w-0">
        <Outlet />
      </main>
    </div>
  )
}



