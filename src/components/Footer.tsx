import { Gamepad2 } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-zinc-800 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-4 h-4 text-purple-500" />
          <span>Lost Our Box Game Developers</span>
        </div>
        <div className="flex gap-6">
          <a
            href="https://www.meetup.com/lost-our-box-game-developers/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            Meetup
          </a>
          <a
            href="https://discord.gg/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            Discord
          </a>
          <a
            href="https://store.steampowered.com/publisher/lostourbox"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            Steam
          </a>
        </div>
      </div>
    </footer>
  )
}
