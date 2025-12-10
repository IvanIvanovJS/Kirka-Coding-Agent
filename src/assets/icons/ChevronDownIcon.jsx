export default function ChevronDownIcon({ width = 14, height = 14, className = '', ...props }) {
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			className={className}
			{...props}
		>
			<polyline points="6 9 12 15 18 9" />
		</svg>
	);
}
