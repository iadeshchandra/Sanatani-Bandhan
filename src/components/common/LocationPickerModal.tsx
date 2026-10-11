import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Search,
  Check,
  X,
  Navigation,
  Globe2,
  Building,
  Sparkles,
  Compass,
  Map as MapIcon
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet Default Icon Issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export interface SelectedLocation {
  city: string;
  state: string;
  country: string;
  address: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
  sampradayaHub?: string;
}

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (loc: SelectedLocation) => void;
  initialCity?: string;
}

const LocationMarker = ({ position, setPosition, setDetails }: any) => {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${e.latlng.lat}&lon=${e.latlng.lng}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.address) {
            setDetails(data.address);
          }
        });
    },
  });

  return position === null ? null : (
    <Marker position={position}>
      <Popup>Selected Location</Popup>
    </Marker>
  );
};

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
  initialCity = 'Varanasi'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [position, setPosition] = useState<L.LatLngExpression | null>([25.3176, 82.9739]);
  const [addressDetails, setAddressDetails] = useState<any>({
    city: 'Varanasi',
    state: 'Uttar Pradesh',
    country: 'India',
    road: 'Vishwanath Gali'
  });
  
  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setPosition([lat, lon]);
        const rev = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`);
        const revData = await rev.json();
        if (revData && revData.address) {
          setAddressDetails(revData.address);
        }
      }
    } catch (e) {
      console.error('Search failed', e);
    }
  };

  const handleConfirm = () => {
    const city = addressDetails.city || addressDetails.town || addressDetails.village || addressDetails.county || 'Unknown City';
    const state = addressDetails.state || 'Unknown State';
    const country = addressDetails.country || 'Unknown Country';
    const road = addressDetails.road || addressDetails.suburb || 'Local Area';
    
    onSelectLocation({
      city,
      state,
      country,
      address: road,
      latitude: (position as any)[0] || 25.3176,
      longitude: (position as any)[1] || 82.9739,
      formattedAddress: `${road}, ${city}, ${state}, ${country}`,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl relative z-10 flex flex-col max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-800 flex items-center gap-2">
              <MapIcon className="w-4 h-4 text-indigo-600" />
              Global Map Picker
            </h2>
            <p className="text-[10px] font-medium text-slate-500 mt-1 uppercase tracking-wider">
              Search or tap on the map to pin a location
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col md:flex-row gap-6 grow overflow-y-auto">
          {/* Left panel */}
          <div className="w-full md:w-1/3 flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Search Location
              </label>
              <div className="relative flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="e.g. Somnath Temple, Gujarat"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-4 py-3 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all"
                />
                <button onClick={handleSearch} className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700">
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mt-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-3 border-b border-slate-200 pb-2">
                Selected Details
              </h3>
              <div className="space-y-3">
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">City / Town</span>
                  <span className="text-sm font-semibold text-slate-700">{addressDetails.city || addressDetails.town || addressDetails.village || addressDetails.county || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">State</span>
                  <span className="text-sm font-semibold text-slate-700">{addressDetails.state || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Country</span>
                  <span className="text-sm font-semibold text-slate-700">{addressDetails.country || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Local Area</span>
                  <span className="text-sm font-semibold text-slate-700">{addressDetails.road || addressDetails.suburb || 'N/A'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleConfirm}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-widest transition-all mt-auto flex justify-center items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Confirm Location
            </button>
          </div>

          {/* Right panel (Map) */}
          <div className="w-full md:w-2/3 h-[400px] md:h-auto rounded-2xl overflow-hidden border-2 border-slate-200 relative">
            <MapContainer center={position as L.LatLngExpression} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              <LocationMarker position={position} setPosition={setPosition} setDetails={setAddressDetails} />
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
