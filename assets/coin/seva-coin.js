/*!
 * SEVA Coin: the animated coin (pure SVG + CSS, no images, no libraries).
 *
 * Drop-in use (needs seva-coin.css):
 *   <div class="seva-coin" data-seva-coin></div>                     animated, default E option
 *   <div class="seva-coin" data-seva-coin data-variant="b"></div>    pick the E option for this coin: a | b | c
 *   <div class="seva-coin" data-seva-coin data-controls></div>       adds "Pause spin" / "Show back" buttons
 *   <div class="seva-coin" data-seva-coin data-static></div>         still front face (footer, icons)
 * Size: set --coin-size on the element (default 320px).
 *
 * THE ONE SETTING for the chosen "E":
 *   DEFAULT_VARIANT below ("a" = three lines, "b" = full E, "c" = three E's), or <html data-coin-variant="b">.
 */
(function (root) {
  "use strict";

  var DEFAULT_VARIANT = "a";

  // The real SEVA logo for the back face, found next to this script (assets/coin -> assets/brand)
  var LOGO_URL = (function () {
    try { var s = root.document && root.document.currentScript; return new URL("../brand/seva-coin-logo-white.png", s ? s.src : root.location.href).href; }
    catch (e) { return "assets/brand/seva-coin-logo-white.png"; }
  })();

  var LABEL = "SEVA Coin: a platinum and navy coin with the SEVA three-line E on the front and the SEVA wordmark on the back";

  // SEVA wordmark outlines (S, V and the striped A of the SEVA logo), in a 425 x 106 box; the E is drawn per option
  var WM = {
    S: "M43.57 102.29Q31 102.29 19.29 99.43Q7.57 96.57 0 92L10.86 67.43Q18 71.57 26.79 74.07Q35.57 76.57 43.86 76.57Q48.71 76.57 51.5 75.93Q54.29 75.29 55.57 74.07Q56.86 72.86 56.86 71.14Q56.86 68.43 53.86 66.86Q50.86 65.29 45.93 64.21Q41 63.14 35.14 61.93Q29.29 60.71 23.36 58.71Q17.43 56.71 12.5 53.43Q7.57 50.14 4.57 44.79Q1.57 39.43 1.57 31.43Q1.57 22.14 6.79 14.5Q12 6.86 22.36 2.29Q32.71-2.29 48.14-2.29Q58.29-2.29 68.14-.14Q78 2 85.86 6.43L75.71 30.86Q68.29 27.14 61.36 25.29Q54.43 23.43 47.86 23.43Q43 23.43 40.14 24.29Q37.29 25.14 36.07 26.57Q34.86 28 34.86 29.71Q34.86 32.29 37.86 33.79Q40.86 35.29 45.79 36.29Q50.71 37.29 56.64 38.43Q62.57 39.57 68.43 41.57Q74.29 43.57 79.21 46.86Q84.14 50.14 87.14 55.43Q90.14 60.71 90.14 68.57Q90.14 77.71 84.93 85.36Q79.71 93 69.43 97.64Q59.14 102.29 43.57 102.29Z",
    V: "M261.57 100H228.43L186.14 0H222.43L246.28 58.43L270.71 0H303.85L261.57 100Z",
    A: "M337.14 100H302.85L346.56 0H379.71L423.42 100H388.56L381.85 82.57H343.85L337.14 100Z",
    cuts: "M308.85 28.2L368.85 9V14.5L308.85 33.7ZM308.85 42.2L368.85 23V28.5L308.85 47.7ZM308.85 56.2L368.85 37V42.5L308.85 61.7Z",
    bars: '<rect x="103.14" y="0" width="70" height="20"/><rect x="103.14" y="40" width="70" height="20"/><rect x="103.14" y="80" width="70" height="20"/>',
    fullE: '<path d="M103.14 0H173.14V20H125.14V40H165.14V60H125.14V80H173.14V100H103.14Z"/>'
  };

  // The caduceus, a faint watermark behind the symbol (never on its own): the classic winged staff with two
  // snakes, traced from the reference artwork into one vector path.
  var CADUCEUS = '<path fill="#3f72bd" fill-rule="evenodd" transform="translate(39.44 39.34) scale(0.58)" d="M280.33 65.17Q285.67 66 289.17 68.17Q292.67 70.33 295.5 73.67Q298.33 77 300.17 82Q302 87 301.5 93.17Q301 99.33 298.83 103.17Q296.67 107 293.83 108.83Q291 110.67 285.67 110.67Q280.33 110.67 270.67 110.33Q261 110 258 105.67Q255 101.33 254.17 97.33Q253.33 93.33 253.67 88.5Q254 83.67 256.17 78.83Q258.33 74 262.17 70.5Q266 67 270.5 65.67Q275 64.33 280.33 65.17ZM215 77Q219.67 77.33 223.83 79.5Q228 81.67 231.5 85.83Q235 90 237.33 97.17Q239.67 104.33 239 108.83Q238.33 113.33 234.67 118.67Q231 124 229.83 123.67Q228.67 123.33 228.67 121.67Q228.67 120 227.67 118.5Q226.67 117 221.33 115.33Q216 113.67 213.67 112Q211.33 110.33 210.17 108.17Q209 106 208.83 100.83Q208.67 95.67 199.67 95.83Q190.67 96 184.17 92.5Q177.67 89 178.33 88Q179 87 186.5 84Q194 81 202.17 78.83Q210.33 76.67 215 77ZM341.67 77Q347 77 351.67 78Q356.33 79 366.33 83.5Q376.33 88 375 90Q373.67 92 368.67 94Q363.67 96 355 95.67Q346.33 95.33 345.83 100.33Q345.33 105.33 344 107.67Q342.67 110 339.33 112.5Q336 115 331.83 116.17Q327.67 117.33 326.17 120.67Q324.67 124 323.83 124Q323 124 321.5 122.5Q320 121 317.83 116Q315.67 111 315.83 104.17Q316 97.33 317.83 92.83Q319.67 88.33 323.67 84.33Q327.67 80.33 332 78.67Q336.33 77 341.67 77ZM170.17 92Q171.67 92 178.5 95.67Q185.33 99.33 185.83 99.67Q186.33 100 186 101Q185.67 102 173 107.5Q160.33 113 152.17 115Q144 117 138.83 117.33Q133.67 117.67 130.17 117.33Q126.67 117 123.67 115.83Q120.67 114.67 118.5 113Q116.33 111.33 116.67 109.83Q117 108.33 142.83 100.17Q168.67 92 170.17 92ZM384.33 92Q386.33 92 411.83 100.17Q437.33 108.33 437.67 109.67Q438 111 436.5 112.5Q435 114 429.17 115.83Q423.33 117.67 419.33 117.83Q415.33 118 409.83 117Q404.33 116 386.5 109Q368.67 102 368.83 100.67Q369 99.33 375.67 95.67Q382.33 92 384.33 92ZM354.33 100.83Q356.33 101 363.33 105.33Q370.33 109.67 377.83 112.83Q385.33 116 393.83 118.33Q402.33 120.67 409.83 121.83Q417.33 123 417.83 124.17Q418.33 125.33 415 127.33Q411.67 129.33 408.5 130.67Q405.33 132 399.67 132.17Q394 132.33 381 127.17Q368 122 358.5 116.67Q349 111.33 349.17 108.17Q349.33 105 350.83 102.83Q352.33 100.67 354.33 100.83ZM201.33 101.67Q203.33 102.33 204.17 106.17Q205 110 203.83 111.5Q202.67 113 197.83 116Q193 119 184.83 123Q176.67 127 169.17 129.5Q161.67 132 157 132.33Q152.33 132.67 148.17 131.67Q144 130.67 140.83 128.67Q137.67 126.67 137.17 125.17Q136.67 123.67 142.67 122.67Q148.67 121.67 158.17 118.83Q167.67 116 183.5 108.5Q199.33 101 201.33 101.67ZM479 114.33Q514 117 514 119Q514 121 510.5 125.5Q507 130 504 132Q501 134 494.83 135.5Q488.67 137 472.33 137Q456 137 437.5 134.83Q419 132.67 418.67 131.67Q418.33 130.67 421 127.83Q423.67 125 429.17 122.33Q434.67 119.67 439.33 115.67Q444 111.67 479 114.33ZM108.33 112Q111.33 112 115.5 116Q119.67 120 124.33 121.5Q129 123 132.5 126.67Q136 130.33 136 131.17Q136 132 123.33 134Q110.67 136 90.5 136.83Q70.33 137.67 64.83 136.83Q59.33 136 54.33 133.67Q49.33 131.33 45.33 127.33Q41.33 123.33 40.5 121.67Q39.67 120 40 118.5Q40.33 117 72.83 114.5Q105.33 112 108.33 112ZM276.83 114.33Q290.33 114.33 291.17 114.83Q292 115.33 291.33 116.67Q290.67 118 277 117.83Q263.33 117.67 262.67 117Q262 116.33 262.67 115.33Q263.33 114.33 276.83 114.33ZM209.5 116Q211.33 116.33 213.67 118.17Q216 120 215.83 121Q215.67 122 213.33 124Q211 126 198.17 134.5Q185.33 143 181.33 144.17Q177.33 145.33 174 145.17Q170.67 145 167.67 143.83Q164.67 142.67 163.33 140.83Q162 139 162.33 138.17Q162.67 137.33 173.67 133.17Q184.67 129 196.17 122.33Q207.67 115.67 209.5 116ZM346.83 116.5Q349 117 361 124Q373 131 382 134.17Q391 137.33 391 139.17Q391 141 388.17 143Q385.33 145 380.83 145.17Q376.33 145.33 373.67 144.67Q371 144 361.33 138.33Q351.67 132.67 345.17 127Q338.67 121.33 339.67 119.5Q340.67 117.67 342.67 116.83Q344.67 116 346.83 116.5ZM276.67 122Q285 122 286 123.5Q287 125 286.33 169Q285.67 213 285 220.17Q284.33 227.33 277.67 228Q271 228.67 269.83 226.83Q268.67 225 267.83 177.83Q267 130.67 267 127Q267 123.33 267.67 122.67Q268.33 122 276.67 122ZM332.17 123.33Q334.33 124.33 344.33 132.5Q354.33 140.67 362.67 144.83Q371 149 371.33 150.67Q371.67 152.33 370 153.17Q368.33 154 361.67 154Q355 154 351 152.5Q347 151 343.5 148.5Q340 146 333.5 139.5Q327 133 327 130.83Q327 128.67 328.5 125.5Q330 122.33 332.17 123.33ZM223.5 122.67Q224.33 122.67 225.33 124.17Q226.33 125.67 226.67 128.83Q227 132 221.5 138.17Q216 144.33 209 148.67Q202 153 197.83 153.83Q193.67 154.67 190.5 154.5Q187.33 154.33 185.17 153.17Q183 152 183.17 150.67Q183.33 149.33 193.83 143.5Q204.33 137.67 213.5 130.17Q222.67 122.67 223.5 122.67ZM322.5 129Q323 130 321.5 132.67Q320 135.33 315.83 140.17Q311.67 145 305.83 149Q300 153 295.17 155Q290.33 157 289.83 156.33Q289.33 155.67 289.83 153.83Q290.33 152 294.83 150.5Q299.33 149 304.33 146Q309.33 143 313.5 138.83Q317.67 134.67 319.83 131.33Q322 128 322.5 129ZM239.17 136Q246.67 143 254.83 147.5Q263 152 263.5 152.5Q264 153 263.67 154.83Q263.33 156.67 259.67 155.33Q256 154 249.67 149.5Q243.33 145 239.17 140.5Q235 136 233.33 132.5Q231.67 129 239.17 136ZM427.83 137.83Q447 140.67 462.5 141Q478 141.33 478.5 142.83Q479 144.33 478 145.83Q477 147.33 473.83 150.17Q470.67 153 467.67 154.17Q464.67 155.33 458 156Q451.33 156.67 445.83 155.83Q440.33 155 418.67 149Q397 143 396.33 142.33Q395.67 141.67 396.33 139.83Q397 138 402.83 136.5Q408.67 135 427.83 137.83ZM149.33 136.83Q157.33 138.33 157.67 139.83Q158 141.33 156.83 142.17Q155.67 143 138.5 148.5Q121.33 154 113.83 155.17Q106.33 156.33 99.83 156.33Q93.33 156.33 90.67 155.67Q88 155 85 153.17Q82 151.33 79.33 147.83Q76.67 144.33 77 143Q77.33 141.67 94.5 140.83Q111.67 140 126.5 137.67Q141.33 135.33 149.33 136.83ZM324.5 138.33Q326 139 332 145.17Q338 151.33 346 155.17Q354 159 354.17 160.83Q354.33 162.67 351.33 163.67Q348.33 164.67 343.33 163.83Q338.33 163 334.67 161.33Q331 159.67 324.67 154.33Q318.33 149 317.5 147Q316.67 145 319.83 141.33Q323 137.67 324.5 138.33ZM230.67 138Q231.67 138 234.17 140.83Q236.67 143.67 236.67 146.17Q236.67 148.67 229.33 154.83Q222 161 217.83 162.5Q213.67 164 210.33 164.33Q207 164.67 203.83 164.17Q200.67 163.67 200.17 161.67Q199.67 159.67 207 156Q214.33 152.33 222 145.17Q229.67 138 230.67 138ZM166.33 148.33Q170.67 150 174.33 150.33Q178 150.67 178.5 151Q179 151.33 178.5 152.17Q178 153 170 157.5Q162 162 155.83 164.5Q149.67 167 142.33 169Q135 171 130.67 171.33Q126.33 171.67 120.33 170Q114.33 168.33 112 166.33Q109.67 164.33 110 163Q110.33 161.67 124.5 158.33Q138.67 155 150.33 150.83Q162 146.67 166.33 148.33ZM391.83 147Q393.67 147 408.17 152Q422.67 157 433.5 159.33Q444.33 161.67 444.5 163Q444.67 164.33 442.83 166.17Q441 168 436 169.67Q431 171.33 427.83 171.67Q424.67 172 417.5 170.5Q410.33 169 396 162.83Q381.67 156.67 379.33 155.17Q377 153.67 376.83 152.5Q376.67 151.33 383.33 149.17Q390 147 391.83 147ZM311.83 150.17Q313 150.33 317.17 155.17Q321.33 160 325.33 162.5Q329.33 165 329.33 166Q329.33 167 328.5 167.33Q327.67 167.67 324.5 166.83Q321.33 166 317 162.5Q312.67 159 310.67 156.17Q308.67 153.33 309.67 151.67Q310.67 150 311.83 150.17ZM244.5 151.17Q246.33 152 244.83 155Q243.33 158 240.67 160.5Q238 163 233.17 165.5Q228.33 168 226.83 167.83Q225.33 167.67 225 166.33Q224.67 165 233.67 157.67Q242.67 150.33 244.5 151.17ZM303.5 156.5Q305 157 306.5 159.33Q308 161.67 312 165.33Q316 169 315.67 169.5Q315.33 170 313 169.5Q310.67 169 307.5 166.33Q304.33 163.67 302.83 161.33Q301.33 159 301.67 157.5Q302 156 303.5 156.5ZM252 156.67Q253.33 157 252.5 159.83Q251.67 162.67 248.83 165.33Q246 168 243.33 169.17Q240.67 170.33 239.33 169.83Q238 169.33 241.33 166.67Q244.67 164 247.67 160.17Q250.67 156.33 252 156.67ZM188.33 158.83Q194.67 160 196.17 163.33Q197.67 166.67 197.17 168Q196.67 169.33 184 176.33Q171.33 183.33 165.83 185.17Q160.33 187 156.33 187.5Q152.33 188 149.67 188Q147 188 144.17 187Q141.33 186 139.5 184.17Q137.67 182.33 137.33 179.83Q137 177.33 147.33 173.67Q157.67 170 169.83 163.83Q182 157.67 188.33 158.83ZM371.33 158.33Q375.33 158.67 386 164.33Q396.67 170 407.17 173.5Q417.67 177 418 178.17Q418.33 179.33 417.67 181.17Q417 183 415.67 184.17Q414.33 185.33 411 186.33Q407.67 187.33 403.67 187.67Q399.67 188 393.17 186.5Q386.67 185 372.5 177.17Q358.33 169.33 357.83 167.83Q357.33 166.33 358.33 163.83Q359.33 161.33 363.33 159.67Q367.33 158 371.33 158.33ZM295.83 160.67Q297.67 161.33 299.33 164Q301 166.67 304 169.33Q307 172 306.5 172.83Q306 173.67 304 172.83Q302 172 297.67 167.83Q293.33 163.67 293.67 161.83Q294 160 295.83 160.67ZM260 160.83Q261 161.33 260.33 163.33Q259.67 165.33 257.33 168Q255 170.67 252.33 172.33Q249.67 174 248.67 173.17Q247.67 172.33 250.83 169.67Q254 167 256.5 163.67Q259 160.33 260 160.83ZM218.83 168.5Q221 169 220.67 171Q220.33 173 210.17 181.5Q200 190 193.67 193Q187.33 196 180.33 195.83Q173.33 195.67 170.67 194Q168 192.33 169.17 190.67Q170.33 189 179.83 184.5Q189.33 180 197.17 174.67Q205 169.33 210.83 168.67Q216.67 168 218.83 168.5ZM340.5 168.5Q347 169 349.5 170Q352 171 360.17 176.5Q368.33 182 376.33 185.5Q384.33 189 385 190.67Q385.67 192.33 384.17 193.67Q382.67 195 380.5 195.83Q378.33 196.67 374 196.5Q369.67 196.33 361.83 193.17Q354 190 348.67 186.33Q343.33 182.67 338.17 177.83Q333 173 332.83 171.33Q332.67 169.67 333.33 168.83Q334 168 340.5 168.5ZM232.17 174.33Q235.67 175.67 238.5 175.33Q241.33 175 242.17 175.67Q243 176.33 241.67 178.33Q240.33 180.33 236.5 181.17Q232.67 182 230.67 183.17Q228.67 184.33 225.5 185.33Q222.33 186.33 219.17 186Q216 185.67 219 181.83Q222 178 225.33 175.5Q228.67 173 232.17 174.33ZM243.17 184.67Q247.67 185 251.83 187Q256 189 257.67 191.33Q259.33 193.67 259.17 196.17Q259 198.67 256.67 200.67Q254.33 202.67 251 203.67Q247.67 204.67 239.67 203.83Q231.67 203 225.17 203Q218.67 203 217 203.83Q215.33 204.67 214.17 206.67Q213 208.67 213.17 211Q213.33 213.33 215.17 216.5Q217 219.67 219.5 222Q222 224.33 225.17 226.17Q228.33 228 233.5 229.5Q238.67 231 264.67 232Q290.67 233 300.67 234.5Q310.67 236 320.83 240Q331 244 336.67 249.17Q342.33 254.33 344.17 258.83Q346 263.33 346 267.67Q346 272 344.5 276.83Q343 281.67 338.33 287.67Q333.67 293.67 326 298.33Q318.33 303 315 304Q311.67 305 307.83 302.67Q304 300.33 297 298.17Q290 296 290.33 295Q290.67 294 298.83 291.17Q307 288.33 309.5 286.5Q312 284.67 314 282Q316 279.33 316.5 277.83Q317 276.33 316.5 271.5Q316 266.67 313.83 263Q311.67 259.33 309.5 257.67Q307.33 256 301 254Q294.67 252 274.83 250.5Q255 249 238.67 246.5Q222.33 244 216.33 241.5Q210.33 239 204.67 234Q199 229 195.5 221.83Q192 214.67 192 211.17Q192 207.67 194 203.33Q196 199 197.83 197.17Q199.67 195.33 203.17 193.67Q206.67 192 216.83 190.5Q227 189 232.83 186.67Q238.67 184.33 243.17 184.67ZM315.83 185.33Q321 186 323.83 188.17Q326.67 190.33 334.17 190.67Q341.67 191 346 192Q350.33 193 354.67 195.83Q359 198.67 361 202.5Q363 206.33 363 211.17Q363 216 362.17 218.67Q361.33 221.33 359.17 224.83Q357 228.33 353.33 231.67Q349.67 235 343.33 238.33Q337 241.67 334.83 241.33Q332.67 241 326.5 238Q320.33 235 316.83 234Q313.33 233 312.83 232.17Q312.33 231.33 319.17 229.5Q326 227.67 330.33 225Q334.67 222.33 337.17 219.5Q339.67 216.67 340.67 212.67Q341.67 208.67 339.83 206Q338 203.33 335 202.17Q332 201 329.17 201Q326.33 201 319.67 203Q313 205 307.33 204.67Q301.67 204.33 299.5 203.5Q297.33 202.67 295.67 200.33Q294 198 294.67 195Q295.33 192 300 189Q304.67 186 307.67 185.33Q310.67 184.67 315.83 185.33ZM242.67 189Q241 189.33 240.83 190.17Q240.67 191 242.83 191.5Q245 192 246.33 191.83Q247.67 191.67 248.17 190.83Q248.67 190 246.5 189.33Q244.33 188.67 242.67 189ZM307.17 189Q305.67 189.33 305.5 190.17Q305.33 191 307.5 191.5Q309.67 192 311 191.83Q312.33 191.67 312.67 190.67Q313 189.67 310.83 189.17Q308.67 188.67 307.17 189ZM236.17 250.17Q252.67 252.67 252.5 253.5Q252.33 254.33 249.33 255.83Q246.33 257.33 244.33 259.33Q242.33 261.33 240 266.17Q237.67 271 238.67 275.33Q239.67 279.67 243.67 283.83Q247.67 288 253.33 290.5Q259 293 279.17 298Q299.33 303 304 305Q308.67 307 312.5 310.33Q316.33 313.67 319.17 319.67Q322 325.67 322.17 332.33Q322.33 339 320.5 343.67Q318.67 348.33 314.17 353Q309.67 357.67 305.83 360.33Q302 363 296.5 358.67Q291 354.33 291.33 353.17Q291.67 352 295.67 349Q299.67 346 301 342.83Q302.33 339.67 302 335.17Q301.67 330.67 298.67 326.67Q295.67 322.67 289.17 319.33Q282.67 316 265.83 312Q249 308 242.17 305.5Q235.33 303 228.67 299Q222 295 218.33 291.33Q214.67 287.67 211.83 281.67Q209 275.67 208.83 270.17Q208.67 264.67 210.83 259Q213 253.33 216.33 250.5Q219.67 247.67 236.17 250.17ZM277.17 254.67Q281.67 254.67 282.83 255.83Q284 257 283.67 273.5Q283.33 290 282 291.33Q280.67 292.67 277.67 293Q274.67 293.33 272.67 291.5Q270.67 289.67 270.17 273.67Q269.67 257.67 270 256.67Q270.33 255.67 271.5 255.17Q272.67 254.67 277.17 254.67ZM255.17 313.33Q267 316.67 266.67 317.67Q266.33 318.67 263.33 320.17Q260.33 321.67 258.33 323.67Q256.33 325.67 254.83 328.67Q253.33 331.67 253.17 336Q253 340.33 255 344.33Q257 348.33 261.5 351.17Q266 354 276.83 355.5Q287.67 357 290.83 358.83Q294 360.67 297 363.83Q300 367 301.5 370.67Q303 374.33 303 377.83Q303 381.33 301.67 384.83Q300.33 388.33 298 390.67Q295.67 393 293 394.17Q290.33 395.33 287.17 393.67Q284 392 284 391.17Q284 390.33 287 388Q290 385.67 290.83 384Q291.67 382.33 291.67 378.83Q291.67 375.33 290.33 373.17Q289 371 287 370Q285 369 275.83 368.5Q266.67 368 261.5 366.5Q256.33 365 252.17 362.5Q248 360 242.17 354Q236.33 348 234.5 343.33Q232.67 338.67 232.83 332.67Q233 326.67 234.67 321.83Q236.33 317 239.83 313.5Q243.33 310 255.17 313.33ZM277.17 319Q279.67 319 281.33 320.67Q283 322.33 282.83 335.67Q282.67 349 281.17 350.17Q279.67 351.33 276.67 351.33Q273.67 351.33 272.67 350.17Q271.67 349 271.5 336Q271.33 323 273 321Q274.67 319 277.17 319ZM259.33 370.17Q263 371.33 262.33 376Q261.67 380.67 263.83 384Q266 387.33 275.67 392Q285.33 396.67 289.33 400.5Q293.33 404.33 294.17 406.33Q295 408.33 295 412Q295 415.67 293.83 418.67Q292.67 421.67 291.33 423Q290 424.33 288.67 424.67Q287.33 425 284.67 423.67Q282 422.33 283.5 418.33Q285 414.33 284.5 411.33Q284 408.33 280.67 405.67Q277.33 403 268.83 398.67Q260.33 394.33 257.67 391.33Q255 388.33 253.83 385.33Q252.67 382.33 252.5 379Q252.33 375.67 253 373.17Q253.67 370.67 254.67 369.83Q255.67 369 259.33 370.17ZM277.67 372.17Q280 372.33 281 373.67Q282 375 281.83 380.17Q281.67 385.33 280.33 386.83Q279 388.33 276.83 388.33Q274.67 388.33 273.67 387Q272.67 385.67 272.67 380.5Q272.67 375.33 274 373.67Q275.33 372 277.67 372.17ZM265.33 401.83Q267 402 269.5 403.67Q272 405.33 270.5 409Q269 412.67 269 414.5Q269 416.33 270.17 418.5Q271.33 420.67 279.17 424.83Q287 429 290 432.5Q293 436 293.17 441.33Q293.33 446.67 291.83 449.17Q290.33 451.67 288.83 452.67Q287.33 453.67 285.33 453.83Q283.33 454 285.33 449.5Q287.33 445 286.67 441.83Q286 438.67 284.33 437Q282.67 435.33 274.17 430.83Q265.67 426.33 262.83 423.17Q260 420 259.33 415.33Q258.67 410.67 260 407.17Q261.33 403.67 262.5 402.67Q263.67 401.67 265.33 401.83ZM277.67 408.83Q279.33 409 280.17 410.33Q281 411.67 280.5 414.67Q280 417.67 279 418.33Q278 419 276.5 418.83Q275 418.67 274.17 417Q273.33 415.33 273.67 412.83Q274 410.33 275 409.5Q276 408.67 277.67 408.83ZM266.83 432Q269 432 270.17 433.17Q271.33 434.33 268.83 438.5Q266.33 442.67 267.17 446.17Q268 449.67 275.33 453.83Q282.67 458 284.67 460.33Q286.67 462.67 287.33 466Q288 469.33 287 471.67Q286 474 284.83 474.17Q283.67 474.33 284.17 471Q284.67 467.67 283.83 466Q283 464.33 274.17 458.67Q265.33 453 263.17 450.33Q261 447.67 260.5 442.83Q260 438 262.33 435Q264.67 432 266.83 432ZM277 437Q278.33 437 279.33 438Q280.33 439 280.33 443.67Q280.33 448.33 279.17 449.33Q278 450.33 276.83 450.33Q275.67 450.33 274.67 449.33Q273.67 448.33 273.67 444Q273.67 439.67 274.67 438.33Q275.67 437 277 437ZM270.67 461.67Q272.33 462.33 271 464.83Q269.67 467.33 270.17 471.17Q270.67 475 269.33 474.5Q268 474 267 471.33Q266 468.67 266.17 466.5Q266.33 464.33 267.67 462.67Q269 461 270.67 461.67ZM278.17 466.17Q279.67 467 279.67 476.83Q279.67 486.67 278.67 488.17Q277.67 489.67 276.33 489Q275 488.33 274.83 485Q274.67 481.67 274.67 475.5Q274.67 469.33 275.67 467.33Q276.67 465.33 278.17 466.17Z"/>';

  // The three "E" options, in the colours of the SEVA logo's E (white, SEVA blue, aqua).
  // a: three equal bars | b: the bars joined by a spine | c: three small E marks in a triangle
  var BAR = ["#2b56a3", "#4ea7f2", "#82d6f6"];   // E colours: deep blue, bright blue, light aqua
  // one E mark W wide centred on (cx, cy), drawn as in the SEVA logo
  function markE(cx, cy, W) {
    var h = W * 0.26, p = W * 0.57;
    return [0, 1, 2].map(function (i) {
      // all three bars start on one left edge; the middle bar is shorter
      var x = cx - W / 2, w = i === 1 ? W * 0.79 : W;
      return '<rect x="' + x.toFixed(1) + '" y="' + (cy - p - h / 2 + i * p).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" fill="' + BAR[i] + '"/>';
    }).join("");
  }
  var E_FRONT = {
    // the E: three left-aligned bars with a thin white border; the top bar sits on the snakes' heads
    a: '<rect x="115" y="104" width="164" height="34" rx="1.5" fill="#2b56a3" stroke="#fff" stroke-width="1.6"/><rect x="115" y="168" width="113" height="31" rx="1.5" fill="#4ea7f2" stroke="#fff" stroke-width="1.6"/><rect x="115" y="229" width="174" height="35" rx="1.5" fill="#82d6f6" stroke="#fff" stroke-width="1.6"/>',
    b: '<path d="M116 131H284V165H152V183H262V217H152V235H284V269H116Z" fill="url(#ID-full)"/>',
    c: markE(200, 146, 50) + markE(150, 244, 50) + markE(250, 244, 50)
  };

  // Engraving: a guilloché rosette of thin rotated ellipses, like the fine lines on a banknote
  var ROSETTE = (function () {
    var s = "";
    for (var i = 0; i < 36; i++) s += '<ellipse cx="200" cy="200" rx="150" ry="58" transform="rotate(' + (i * 5) + ' 200 200)"/>';
    return s;
  })();
  // Reeded edge: fine ticks all round the rim
  var REEDS = (function () {
    var s = "";
    for (var i = 0; i < 144; i++) {
      var a = (i / 144) * Math.PI * 2, c = Math.cos(a), n = Math.sin(a);
      s += "M" + (200 + c * 186).toFixed(1) + " " + (200 + n * 186).toFixed(1) + "L" + (200 + c * 194).toFixed(1) + " " + (200 + n * 194).toFixed(1);
    }
    return s;
  })();

  // Option A rendered as glossy enamel bars: gradient, white edge, a shine line along the top and a soft blue glow
  var E_BARS = [[114, 136, 172, 35, "#ffffff", "#dfe6f0"], [114, 190, 172, 35, "#7dbcf5", "#3f88dc"], [114, 242, 172, 35, "#b6eefc", "#68cdee"]];   // three equal bars, centred: white, blue, aqua
  function glossyE(u) {
    return E_BARS.map(function (b, i) {
      return '<rect x="' + b[0] + '" y="' + b[1] + '" width="' + b[2] + '" height="' + b[3] + '" rx="5" fill="url(#' + u + 'g' + i + ')" stroke="#fff" stroke-opacity=".85" stroke-width="1.4"/>' +
        '<rect x="' + (b[0] + 3) + '" y="' + (b[1] + 2.6) + '" width="' + (b[2] - 6) + '" height="' + (b[3] * 0.26).toFixed(1) + '" rx="1.5" fill="#fff" opacity=".38"/>';
    }).join("");
  }
  function glossyDefs(u) {
    return E_BARS.map(function (b, i) {
      return '<linearGradient id="' + u + 'g' + i + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + b[4] + '"/><stop offset="1" stop-color="' + b[5] + '"/></linearGradient>';
    }).join("");
  }
  // the caduceus as an embossed relief: a dark cast shadow, a light top edge, then the metal fill
  function embossed(u) {
    var layer = function (fill) { return CADUCEUS.replace('fill="#3f72bd"', fill); };
    return '<g transform="translate(1.6 2.6)">' + layer('fill="#020b1c" fill-opacity=".35"') + "</g>" +
      '<g transform="translate(-1 -1.2)">' + layer('fill="#ffffff" fill-opacity=".5"') + "</g>" +
      layer('fill="url(#' + u + 'cad)"');
  }

  var uidCount = 0;

  // One face of the coin as an SVG string. side: "front" | "back". opts.minimal drops the engraving and the
  // watermark (favicons); opts.xmlns adds the namespace (standalone .svg files).
  function svg(side, variant, opts) {
    opts = opts || {};
    var u = "sc" + (++uidCount) + "-";
    var id = function (n) { return u + n; };
    var url = function (n) { return "url(#" + u + n + ")"; };
    var symbol;
    if (side === "back") {
      // the SEVA logo with COIN in place of HEALTHCARE (white version for the navy face)
      symbol = '<image href="' + LOGO_URL + '" x="80" y="151" width="240" height="98.7" preserveAspectRatio="xMidYMid meet"/>';
    } else {
      symbol = '<g class="sc-e sc-e-' + variant + '">' + (variant === "a" ? glossyE(u) : E_FRONT[variant].replace(/ID-/g, u)) + "</g>";
    }
    var engraving = opts.minimal ? "" :
      '<g fill="none" stroke="#9ad2e2" stroke-width=".6" opacity=".09">' + ROSETTE + "</g>" +
      '<circle cx="200" cy="200" r="152" fill="none" stroke="#9ad2e2" stroke-opacity=".22" stroke-width="1"/>';
    var watermark = opts.minimal ? "" :
      (side === "back" ? '<g opacity=".18">' + CADUCEUS + "</g>" : '<g class="sc-cad" opacity=".3">' + embossed(u) + "</g>");   // faint on the back so the logo reads
    var shine = opts.minimal ? "" :
      '<g clip-path="' + url("clip") + '"><g transform="rotate(22 200 200)"><rect class="sc-shine" x="-170" y="-140" width="110" height="680" fill="' + url("shine") + '"/></g></g>';
    return '<svg ' + (opts.xmlns ? 'xmlns="http://www.w3.org/2000/svg" ' : "") + 'viewBox="0 0 400 400" class="sc-svg" focusable="false" aria-hidden="true">' +
      "<defs>" +
        // platinum rim: bright and dark bands, like brushed metal catching light
        '<linearGradient id="' + id("rim") + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7f9fb"/><stop offset=".22" stop-color="#c3ccd6"/><stop offset=".45" stop-color="#eef2f6"/><stop offset=".7" stop-color="#8e9aa8"/><stop offset="1" stop-color="#5d6978"/></linearGradient>' +
        '<linearGradient id="' + id("bevel") + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5d6978"/><stop offset="1" stop-color="#f1f4f7"/></linearGradient>' +
        // deep navy face, lit from the top left
        '<radialGradient id="' + id("face") + '" cx=".36" cy=".3" r=".8"><stop offset="0" stop-color="#2f5f90"/><stop offset=".45" stop-color="#15385d"/><stop offset="1" stop-color="#061629"/></radialGradient>' +
        '<linearGradient id="' + id("b1") + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dfe8f1"/></linearGradient>' +
        '<linearGradient id="' + id("b2") + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#86b3dd"/><stop offset="1" stop-color="#5389bf"/></linearGradient>' +
        '<linearGradient id="' + id("b3") + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c3ebf4"/><stop offset="1" stop-color="#8ccadb"/></linearGradient>' +
        '<linearGradient id="' + id("full") + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#cfe3f2"/><stop offset="1" stop-color="#9ad2e2"/></linearGradient>' +
        '<filter id="' + id("lift") + '" x="-15%" y="-15%" width="130%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#020a16" flood-opacity=".6"/></filter>' +
        '<linearGradient id="' + id("shine") + '" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".28"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
        glossyDefs(u) +
        '<linearGradient id="' + id("cad") + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef7ff"/><stop offset=".55" stop-color="#c4ddf5"/><stop offset="1" stop-color="#9cc3e8"/></linearGradient>' +
        '<radialGradient id="' + id("vig") + '" cx=".5" cy=".5" r=".5"><stop offset=".62" stop-color="#020814" stop-opacity="0"/><stop offset="1" stop-color="#020814" stop-opacity=".55"/></radialGradient>' +
        '<filter id="' + id("eglow") + '" x="-30%" y="-60%" width="160%" height="220%"><feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="#3fa0ff" flood-opacity=".5"/><feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#020a16" flood-opacity=".6"/></filter>' +
        '<filter id="' + id("soft") + '" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="3"/></filter>' +
        '<filter id="' + id("soft1") + '" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1"/></filter>' +
        '<clipPath id="' + id("clip") + '"><circle cx="200" cy="200" r="196"/></clipPath>' +
        '<mask id="' + id("cuts") + '" maskUnits="userSpaceOnUse" x="290" y="-10" width="150" height="120"><rect x="290" y="-10" width="150" height="120" fill="#fff"/><path d="' + WM.cuts + '" fill="#000"/></mask>' +
      "</defs>" +
      // rim with a reeded edge, then a bevel stepping down to the face
      '<circle cx="200" cy="200" r="196" fill="' + url("rim") + '"/>' +
      (opts.minimal ? "" : '<path d="' + REEDS + '" stroke="#3d4856" stroke-opacity=".28" stroke-width="1.2"/>') +
      '<circle cx="200" cy="200" r="183" fill="' + url("bevel") + '"/>' +
      '<circle cx="200" cy="200" r="178" fill="' + url("face") + '"/>' +
      '<circle cx="200" cy="200" r="178" fill="none" stroke="#020a16" stroke-opacity=".5" stroke-width="1.5"/>' +
      '<circle cx="200" cy="200" r="178" fill="' + url("vig") + '"/>' +
      '<circle cx="200" cy="200" r="174" fill="none" stroke="#3d9bff" stroke-width="4" opacity=".75" filter="' + url("soft") + '"/>' +
      '<circle cx="200" cy="200" r="174" fill="none" stroke="#7cc0ff" stroke-width="1.6"/>' +
      (opts.minimal ? "" : '<path d="M35.5 105A190 190 0 0 1 135 21.5" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" opacity=".85" filter="' + url("soft1") + '"/>' +
        '<path d="M330 330A190 190 0 0 1 290 366" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".45" filter="' + url("soft1") + '"/>') +
      engraving + watermark +
      '<g filter="' + url(side === "back" ? "lift" : "eglow") + '">' + symbol + "</g>" +
      (opts.minimal || side === "back" ? "" : '<path class="sc-spark" d="M0 -9C1 -2 2 -1 9 0C2 1 1 2 0 9C-1 2 -2 1 -9 0C-2 -1 -1 -2 0 -9Z" fill="#fff" transform="translate(276 104)"/>') +
      shine +
      "</svg>";
  }

  var motionOK = function () { return !(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches); };

  function mount(el) {
    if (el.__sevaCoin) return;
    el.__sevaCoin = true;
    var html = root.document.documentElement;
    var variant = (el.getAttribute("data-variant") || html.getAttribute("data-coin-variant") || DEFAULT_VARIANT).toLowerCase();
    if (!E_FRONT[variant]) variant = DEFAULT_VARIANT;
    el.setAttribute("data-variant", variant);
    var isStatic = el.hasAttribute("data-static");
    if (isStatic) el.classList.add("is-static");

    el.innerHTML =
      '<div class="sc-stage" role="img" aria-label="' + (el.getAttribute("data-label") || LABEL) + '">' +
        '<div class="sc-tilt"><div class="sc-flipper">' +
          '<div class="sc-face sc-front">' + svg("front", variant) + "</div>" +
          (isStatic ? "" : '<div class="sc-face sc-back">' + svg("back", variant) + "</div>") +
        "</div></div>" +
      "</div>" +
      (el.hasAttribute("data-controls") && !isStatic ?
        '<div class="sc-controls">' +
          '<button type="button" class="sc-btn" data-sc="pause" aria-pressed="false">Pause spin</button>' +
          '<button type="button" class="sc-btn" data-sc="side">Show back</button>' +
        "</div>" : "");
    if (isStatic) return;

    // Controls: pause/resume the loop; show a chosen side (stops the loop until "Resume spin")
    var pauseBtn = el.querySelector('[data-sc="pause"]'), sideBtn = el.querySelector('[data-sc="side"]');
    function sync() {
      var stopped = el.classList.contains("is-paused") || el.classList.contains("is-manual");
      if (pauseBtn) { pauseBtn.textContent = stopped ? "Resume spin" : "Pause spin"; pauseBtn.setAttribute("aria-pressed", String(stopped)); }
      if (sideBtn) sideBtn.textContent = el.classList.contains("is-manual") && el.classList.contains("show-back") ? "Show front" : "Show back";
    }
    if (pauseBtn) pauseBtn.addEventListener("click", function () {
      if (el.classList.contains("is-paused") || el.classList.contains("is-manual")) el.classList.remove("is-paused", "is-manual", "show-back");
      else el.classList.add("is-paused");
      sync();
    });
    if (sideBtn) sideBtn.addEventListener("click", function () {
      var showBack = !(el.classList.contains("is-manual") && el.classList.contains("show-back"));
      el.classList.remove("is-paused");
      el.classList.add("is-manual");
      el.classList.toggle("show-back", showBack);
      sync();
    });

    // Hover (mouse / pen): the coin tilts a little towards the pointer
    var stage = el.querySelector(".sc-stage");
    if (root.matchMedia && root.matchMedia("(hover: hover) and (pointer: fine)").matches && motionOK()) {
      stage.addEventListener("pointermove", function (ev) {
        var r = stage.getBoundingClientRect();
        var x = (ev.clientX - r.left) / r.width - 0.5, y = (ev.clientY - r.top) / r.height - 0.5;
        el.style.setProperty("--tilt-y", (x * 22).toFixed(2) + "deg");
        el.style.setProperty("--tilt-x", (-y * 22).toFixed(2) + "deg");
      });
      stage.addEventListener("pointerleave", function () { el.style.removeProperty("--tilt-x"); el.style.removeProperty("--tilt-y"); });
    }
  }

  function mountAll(scope) { (scope || root.document).querySelectorAll("[data-seva-coin]").forEach(mount); }

  var api = { DEFAULT_VARIANT: DEFAULT_VARIANT, CADUCEUS: CADUCEUS, svg: svg, mount: mount, mountAll: mountAll, WM: WM };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root.document) {
    root.SevaCoin = api;
    if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", function () { mountAll(); });
    else mountAll();
  }
})(typeof window !== "undefined" ? window : globalThis);
