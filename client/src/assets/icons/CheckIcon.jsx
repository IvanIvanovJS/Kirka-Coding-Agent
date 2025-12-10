export default function CheckIcon({ width = 20, height = 20, className = '', ...props }) {
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
			<polyline points="20 6 9 17 4 12" />
		</svg>
	);
}
