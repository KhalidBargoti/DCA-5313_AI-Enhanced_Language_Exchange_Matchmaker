import axios from 'axios';

const BASE = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080').replace(/\/+$/,'');

const instance = axios.create({
    baseURL: BASE
//    withCredentials: true
});

instance.interceptors.response.use(
    (response) => {
        const{data} = response;
        return response.data;

    }

)

export default instance;