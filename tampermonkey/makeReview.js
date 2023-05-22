// ==UserScript==
// @name         make review
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  make the review your own.
// @author       MountGao
// @match        https://www.amazon.com/gp/customer-reviews/*
// @match        https://www.amazon.com/review/*
// @match        https://www.amazon.co.uk/gp/customer-reviews/*
// @match        https://www.amazon.co.uk/review/*
// @match        https://www.amazon.de/gp/customer-reviews/*
// @match        https://www.amazon.de/review/*
// @match        https://www.amazon.fr/gp/customer-reviews/*
// @match        https://www.amazon.fr/review/*
// @match        https://www.amazon.it/gp/customer-reviews/*
// @match        https://www.amazon.it/review/*
// @match        https://www.amazon.es/gp/customer-reviews/*
// @match        https://www.amazon.es/review/*
// @match        https://www.amazon.co.jp/gp/customer-reviews/*
// @match        https://www.amazon.co.jp/review/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=amazon.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function makeReview () {
        try {
            const rule = /^https:\/\/www\.amazon\.(com|de|fr|it|es|co\.uk|co\.jp)\/(gp\/customer-reviews|review)\/\w+/;
            if (!(rule.test(window.location.href))) return;

            const crBar = document.querySelector('.cr-vote-action-bar');
            const crVote = crBar.querySelector('.cr-vote[data-hook="review-voting-widget"]');
            const separator = crBar.querySelector('.a-icon-text-separator');
            const reportBox = crBar.querySelector('.cr-footer-line-height');
            const btnVote = crVote.querySelector('.cr-helpful-button');

            btnVote.querySelector('.a-button').classList.add('a-button-small');

            const btnDel = btnVote.cloneNode(true);

            crVote.querySelector('.cr-helpful-text').textContent = 'Edit';
            btnDel.querySelector('.cr-helpful-text').textContent = 'Delete';
            crVote.appendChild(btnDel);
            reportBox.innerHTML = '<span></span>';
            reportBox.insertAdjacentHTML('beforebegin', separator.outerHTML);
        } catch (err) {
            alert('Oops!!!');
        }
    }

    window.addEventListener('load', makeReview);
})();
