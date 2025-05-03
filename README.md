# Chrome Interaction Collector Extension

<div align="center">
  <img src="icon.png" alt="Extension Logo" width="128" height="128">
  <br>
  <img src="demo.gif" alt="Extension Demo" width="400">
</div>

A Chrome extension that collects and monitors user interactions on webpages, including mouse movements, scrolls, clicks, and keypresses.

## Features

- **Real-time Interaction Tracking**
  - Mouse movements
  - Scroll actions
  - Click events
  - Keypress events
  - Session-based tracking

- **Interactive Dashboard**
  - Real-time statistics display
  - Total metrics tracking
  - Download history with timestamps
  - Start/Stop collection toggle
  - Configurable interaction limit

- **Data Management**
  - Automatic downloads when interaction limit is reached
  - Session-based data organization
  - JSON format output
  - Download history tracking

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Usage

1. Click the extension icon to open the popup interface
2. Use the toggle button to start/stop collecting interactions
3. Monitor real-time statistics in the popup
4. Set your preferred interaction limit (default: 1000)
5. View download history of collected data

## Output Format

The extension generates JSON files with the following structure:

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-03-21T10:30:45.123Z",
  "interactions": [
    {
      "type": "mousemove",
      "x": 150,
      "y": 200,
      "timestamp": "2024-03-21T10:30:45.123Z"
    },
    {
      "type": "scroll",
      "deltaX": 0,
      "deltaY": 100,
      "timestamp": "2024-03-21T10:30:46.234Z"
    },
    {
      "type": "click",
      "x": 300,
      "y": 400,
      "button": "left",
      "timestamp": "2024-03-21T10:30:47.345Z"
    },
    {
      "type": "keypress",
      "key": "a",
      "timestamp": "2024-03-21T10:30:48.456Z"
    }
  ]
}
```

### Interaction Types

1. **Mouse Movement**
   - Tracks cursor position (x, y coordinates)
   - Includes timestamp of the movement

2. **Scroll**
   - Records scroll direction and distance
   - Tracks both horizontal and vertical scrolling

3. **Click**
   - Captures click position
   - Records which mouse button was used
   - Includes click timestamp

4. **Keypress**
   - Records the pressed key
   - Includes timestamp of the keypress

## Configuration

- **Interaction Limit**: Set the number of interactions before automatic download (default: 1000)
- **Collection Toggle**: Start/stop data collection at any time
- **Session Management**: Each browser tab maintains its own session ID

## Privacy

- All data is stored locally
- No data is sent to external servers
- Data is only downloaded when explicitly requested or when the interaction limit is reached

## Development

The extension consists of the following components:
- `manifest.json`: Extension configuration
- `popup.html/js`: User interface and controls
- `content.js`: Interaction tracking logic
- `background.js`: Data management and download handling

## License

MIT License 