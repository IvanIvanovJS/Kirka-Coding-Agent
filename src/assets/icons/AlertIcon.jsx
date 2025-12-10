export default function AlertIcon({ width = 24, height = 24, className = '', ...props }) {
	return (
		<svg
			viewBox="0 0 24 24"
			width={width}
			height={height}
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			{...props}
		>
			<path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
		</svg>
	);
}
