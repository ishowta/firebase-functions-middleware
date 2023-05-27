import React, { createRoot } from 'react-dom/client';

const App = () => {
  return (
    <div>
      <p>Hello world!</p>
    </div>
  );
};

const container = document.getElementById('root');
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const root = createRoot(container!);
root.render(<App />);
