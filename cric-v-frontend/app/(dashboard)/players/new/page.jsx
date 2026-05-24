import Navbar from '@/components/layout/Navbar'
import PageHeader from '@/components/layout/PageHeader'
import PlayerForm from '@/components/players/PlayerForm'

export default function NewPlayerPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <Navbar title="Add Player" />
            <div className="flex-1 p-6">
                <PageHeader
                    title="Add New Player"
                    description="Register a new cricketer to your squad"
                    backHref="/players"
                    backLabel="Players"
                />
                <PlayerForm />
            </div>
        </div>
    )
}