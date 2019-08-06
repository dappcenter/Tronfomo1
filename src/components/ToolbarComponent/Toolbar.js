import React from 'react';

import DrawerToggleButton from '../SideDrawer/DrawerToggleButton'
import './Toolbar.scss';
import Logo from "../../assets/logoIcon";
import {animateScroll as scroll} from "react-scroll/modules";


const toolbar = props => {

    return (
        <header id="toolbar" className="toolbar">
            <nav className="toolbar__navigation">
                <div className="toolbar__toggle-button">
                    <DrawerToggleButton click={props.drawerClickHandler}/>
                </div>
                <div className="toolbar__logo">
                    <a href="/">
                        <Logo width={30}/>
                    </a>
                </div>
                <div className="toolbar__logo_text">
                    <a href="/">
                        Showcase P3D
                    </a>
                </div>
                <div className="spacer"></div>
                <div className="toolbar_navigation-items">
                    <ul>
                        <li><a
                            href='/showcase-p3d/'
                            rel='noopener noreferrer'
                            target='_blank'>Contract</a></li>
                        <li onClick={() => scroll.scrollToBottom()}>Communities</li>

                    </ul>
                </div>
            </nav>

        </header>
    )
};



export default toolbar;

