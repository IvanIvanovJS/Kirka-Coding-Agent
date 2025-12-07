import styles from './GhostIcon.module.css';

export default function GhostIcon({
	className = '',
	size = 100,
	isWorking = false,
	onApp = false,
}) {
	const isIdle = onApp ? styles.idle : '';
	const animationClass = isWorking ? styles.working : isIdle;

	return (
		<svg
			viewBox="0 0 64 64"
			width={size}
			height={size}
			className={`${styles.ghostIcon} ${animationClass} ${className}`}
			xmlns="http://www.w3.org/2000/svg"
		>
			{/* Ghost Body & Legs */}
			<path
				d="
          M16 50
        C16 50 14 12 34 12
        C48 12 50 28 50 36
        V50

        C50 50 48 54 44.3 54
        C40.6 54 38 50 38 50
        C38 50 36 54 32.3 54
        C28.6 54 26 50 26 50
        C26 50 24 54 20.3 54
        C16.6 54 16 50 16 50
        Z
    "
				fill="rgba(224, 231, 255, 0.8)"
				stroke="none"
				strokeWidth="1"
				strokeLinejoin="round"
				strokeLinecap="round"
			/>

			{/* Face - Eyes */}
			<circle cx="34" cy="22.5" r="1.2" fill="rgb(26, 11, 46, 0.7)" />
			<circle cx="42" cy="22.5" r="1.1" fill="rgb(26, 11, 46, 0.7)" />

			{/* Face - Smile */}
			<path
				d="M34 30Q38 34 41 30"
				stroke="rgb(26, 11, 46, 0.5)"
				fill="rgb(26, 11, 46, 0.7)"
				strokeWidth="0.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>

			{/* Face - Blush */}
			<circle cx="29" cy="27" r="1" fill="#a78bfa" opacity="0.6" />
			<circle cx="45" cy="27" r="0.9" fill="#a78bfa" opacity="0.6" />

			{/* Bow on Head */}
			<path
				d="M30 10Q32 8 34 10Q32 12 30 10Z"
				fill="rgba(139, 92, 246, 0.5)"
				stroke="rgba(139, 92, 246, 0.8)"
				strokeWidth="1.5"
			/>
			<path
				d="M34 10Q36 8 38 10Q36 12 34 10Z"
				fill="rgba(139, 92, 246, 0.5)"
				stroke="rgba(139, 92, 246, 0.8)"
				strokeWidth="1.5"
			/>
			<circle cx="34" cy="10" r="1.5" fill="#e0e7ff" opacity="0.6" />

			{/* Pickaxe - Detailed version scaled and positioned */}
			<g className="pickaxe" transform="translate(46, 28) scale(0.90)">
				<path
					fillRule="evenodd"
					clipRule="evenodd"
					d="M3.02172 1.79241C3.11977 1.33042 3.52766 1 3.99994 1H7.49994C10.8167 1 13.9504 2.15662 16.5142 4.05499L16.8139 3.77241C17.2074 3.40139 17.8246 3.41046 18.207 3.79289L20.207 5.79289C20.5895 6.17532 20.5986 6.79251 20.2275 7.18601L19.945 7.48571C21.8433 10.0496 22.9999 13.1833 22.9999 16.5V20C22.9999 20.4723 22.6695 20.8802 22.2075 20.9782C21.7455 21.0763 21.2779 20.8377 21.0861 20.4061C19.5548 16.9607 17.8884 14.1436 15.9191 11.7594L5.78873 22.5551C4.82264 23.5847 3.19624 23.6105 2.19791 22.6122L1.38775 21.802C0.389428 20.8037 0.415275 19.1773 1.44482 18.2112L12.2405 8.08084C9.85633 6.11151 7.03927 4.44513 3.5938 2.91381C3.16223 2.722 2.92368 2.2544 3.02172 1.79241ZM13.7415 9.41504L2.81338 19.6696C2.60747 19.8629 2.6023 20.1881 2.80197 20.3878L3.61213 21.198C3.81179 21.3976 4.13707 21.3925 4.33029 21.1866L14.5849 10.2585C14.3099 9.97106 14.0289 9.69005 13.7415 9.41504ZM8.31869 3.02736C10.6049 4.30007 12.6125 5.70113 14.4033 7.30303C15.2115 8.026 15.9739 8.78848 16.6969 9.59669C18.2988 11.3875 19.6999 13.3951 20.9726 15.6813C20.7848 12.8712 19.6408 10.2169 17.8574 8.06282C17.2794 7.36462 16.6353 6.72057 15.9371 6.14252C13.783 4.35913 11.1287 3.21514 8.31869 3.02736Z"
					fill="rgb(224, 231, 255, 0.85)"
				/>
				<circle
					cx="3"
					cy="16"
					r="2"
					strokeWidth="2.5"
					stroke="rgba(167, 139, 250, 0.9)"
					fill="rgba(167, 139, 250, 0.5)"
				/>
			</g>
		</svg>
	);
}
