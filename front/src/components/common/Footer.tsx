import { Facebook } from '@mui/icons-material';
import Copyright from '../utils/Copyright';

export default function Footer() {
    return (
        <div className="footer fixed-bottom bg-black text-white">
            <footer className="row justify-content-around">
                <div className="col-xs-12 col-sm-8 col-sm-pull-6 text-center">
                    <p className="small my-1">
                        Avenida Horacio #1844 piso 9, Polanco 1ra seccion Ciudad de Mexico
                    </p>
                    <a href="https://www.facebook.com/CadLan-910312062339700" className="text-white">
                        <Facebook />
                    </a>
                    <hr className="my-1"></hr>
                    <p className="custom-control-description small my-1"><Copyright /></p>
                </div>
            </footer>
        </div>
    )
}
