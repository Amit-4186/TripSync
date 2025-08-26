import { useParams, Link } from "react-router-dom"; 
export default function TripDetail() { 
    const { id } = useParams(); 
    return ( 
        <div style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}> 
            <Link to="/app">← Back</Link> 
            <h2>Trip Detail (coming next)</h2> 
            <p>Trip ID: {id}</p> 
        </div> 
    ); 
}