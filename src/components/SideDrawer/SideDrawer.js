import React from 'react';
import './SideDrawer.scss';
import {animateScroll as scroll} from "react-scroll/modules";

const sideDrawer = props => {
    let drawerClass = 'side-drawer';
    if (props.show) {
        drawerClass = 'side-drawer open';
    }

    return (
        <nav className={drawerClass}>
            <ul>
                <li>
                    <a
                        href='/showcase-p3d/'
                        rel='noopener noreferrer'
                        target='_blank'>
                        Contract</a></li>
                <li onClick={() => scroll.scrollToBottom()}>Communities</li>
            </ul>
        </nav>
    )
};

export default sideDrawer;