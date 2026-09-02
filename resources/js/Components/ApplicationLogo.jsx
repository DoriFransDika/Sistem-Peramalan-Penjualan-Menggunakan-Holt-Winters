export default function ApplicationLogo(props) {
    return (
        <img
            {...props}
            src="/Logo.jpeg"
            alt="Logo AGRORRA KOERINTJI"
            className={`object-contain rounded-full ${props.className || ''}`}
        />
    );
}
