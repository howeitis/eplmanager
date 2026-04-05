interface TransferTickerProps {
  messages: string[];
}

export function TransferTicker({ messages }: TransferTickerProps) {
  return (
    <div>
      <h2 className="plm-text-sm plm-font-bold plm-text-gray-900 plm-mb-3">
        Transfer Ticker
      </h2>
      {messages.length === 0 ? (
        <p className="plm-text-sm plm-text-gray-400 plm-text-center plm-py-8">
          No transfers yet this window.
        </p>
      ) : (
        <div role="log" aria-label="Transfer activity" className="plm-bg-white plm-rounded-lg plm-border plm-border-gray-200 plm-divide-y plm-divide-gray-100">
          {messages.map((message, i) => (
            <div key={i} className="plm-px-3 plm-py-2 plm-text-xs plm-text-gray-700">
              {message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
