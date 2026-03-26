export function ErrorBanner() {
  return (
    <>
      <div
        style={{
          backgroundColor: '#ffcccc',
          color: '#990000',
          padding: '10px',
          textAlign: 'center',
        }}
      >
        <strong>Error:</strong> An unexpected error occurred. Please try again
        later.
      </div>
    </>
  )
}
