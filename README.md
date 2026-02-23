# JSON Viewer

JSON Viewer is a powerful, local-first web application for viewing, analyzing, and transforming JSON data. Built with React, TypeScript, and Vite, it features a modern, responsive UI powered by Tailwind CSS and Shadcn UI components.

## Features

- **File Upload**: Easily load local JSON files for immediate viewing.
- **Raw Data Table**: Search, filter, and paginate through your JSON data in a clear tabular format.
- **Pivot Table & Charts**: Perform complex data analysis and visualization directly in the browser using `react-pivottable` and `plotly.js`.
- **Data Transformation**: Apply custom transformations to your data on the fly.
- **Secure & Local**: All data processing is done locally in your browser. No data is sent to external servers.

## Tech Stack

- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Shadcn UI](https://ui.shadcn.com/) (Radix UI primitives)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Data Visualization**: `react-pivottable` and `react-plotly.js`

## Getting Started

### Prerequisites

You will need Node.js and npm installed on your machine.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/view-json.git
   cd view-json
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to the local URL provided by Vite (typically `http://localhost:5173` or `http://127.0.0.1:5173`).

## Building for Production

To create a production build, run:

```bash
npm run build
```

This will generate a `dist` directory with the compiled minified assets, ready for deployment.

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## License

This project is open-source and available under the MIT License.
