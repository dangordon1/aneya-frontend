import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../test/utils/render'
import { AudioPlayer } from './AudioPlayer'

describe('AudioPlayer', () => {
  beforeEach(() => {
    // Mock HTMLMediaElement methods
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
    window.HTMLMediaElement.prototype.pause = vi.fn()
  })

  describe('rendering', () => {
    it('renders play button', () => {
      render(<AudioPlayer audioUrl="https://example.com/audio.mp3" />)
      expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument()
    })

    it('renders volume controls', () => {
      render(<AudioPlayer audioUrl="https://example.com/audio.mp3" />)
      expect(screen.getByRole('button', { name: 'Mute' })).toBeInTheDocument()
    })

    it('renders time display', () => {
      render(<AudioPlayer audioUrl="https://example.com/audio.mp3" />)
      // Both current time and duration show 0:00 initially
      const timeDisplays = screen.getAllByText('0:00')
      expect(timeDisplays.length).toBe(2)
    })

    it('renders with custom className', () => {
      const { container } = render(
        <AudioPlayer audioUrl="https://example.com/audio.mp3" className="custom-class" />
      )
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('custom-class')
    })

    it('renders progress slider', () => {
      render(<AudioPlayer audioUrl="https://example.com/audio.mp3" />)
      const sliders = screen.getAllByRole('slider')
      expect(sliders.length).toBeGreaterThan(0)
    })

    it('renders audio element with correct source', () => {
      const { container } = render(
        <AudioPlayer audioUrl="https://example.com/audio.mp3" />
      )
      const audio = container.querySelector('audio')
      expect(audio).toHaveAttribute('src', 'https://example.com/audio.mp3')
    })
  })

  describe('GCS URL conversion', () => {
    it('converts gs:// URLs to https URLs', () => {
      const { container } = render(
        <AudioPlayer audioUrl="gs://my-bucket/path/to/audio.mp3" />
      )
      const audio = container.querySelector('audio')
      expect(audio).toHaveAttribute(
        'src',
        'https://storage.googleapis.com/my-bucket/path/to/audio.mp3'
      )
    })

    it('leaves https URLs unchanged', () => {
      const { container } = render(
        <AudioPlayer audioUrl="https://example.com/audio.mp3" />
      )
      const audio = container.querySelector('audio')
      expect(audio).toHaveAttribute('src', 'https://example.com/audio.mp3')
    })
  })

  describe('play/pause functionality', () => {
    it('toggles between play and pause icons when clicked', async () => {
      const { user } = render(
        <AudioPlayer audioUrl="https://example.com/audio.mp3" />
      )

      const playButton = screen.getByRole('button', { name: 'Play' })
      await user.click(playButton)

      expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
    })

    it('calls audio.play when play button clicked', async () => {
      const { user, container } = render(
        <AudioPlayer audioUrl="https://example.com/audio.mp3" />
      )

      const audio = container.querySelector('audio') as HTMLAudioElement
      const playSpy = vi.spyOn(audio, 'play')

      await user.click(screen.getByRole('button', { name: 'Play' }))
      expect(playSpy).toHaveBeenCalled()
    })

    it('calls audio.pause when pause button clicked', async () => {
      const { user, container } = render(
        <AudioPlayer audioUrl="https://example.com/audio.mp3" />
      )

      const audio = container.querySelector('audio') as HTMLAudioElement
      const pauseSpy = vi.spyOn(audio, 'pause')

      // Click play first
      await user.click(screen.getByRole('button', { name: 'Play' }))
      // Then pause
      await user.click(screen.getByRole('button', { name: 'Pause' }))

      expect(pauseSpy).toHaveBeenCalled()
    })
  })

  describe('mute functionality', () => {
    it('toggles mute state when volume button clicked', async () => {
      const { user } = render(
        <AudioPlayer audioUrl="https://example.com/audio.mp3" />
      )

      const muteButton = screen.getByRole('button', { name: 'Mute' })
      await user.click(muteButton)

      expect(screen.getByRole('button', { name: 'Unmute' })).toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('has background styling', () => {
      const { container } = render(
        <AudioPlayer audioUrl="https://example.com/audio.mp3" />
      )
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('bg-gray-50')
      expect(wrapper).toHaveClass('rounded-lg')
    })
  })
})
