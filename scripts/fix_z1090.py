import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from update_layout import (
    build_footer, build_header, ensure_layout_css, ensure_layout_js,
    get_active, get_prefix,
)

fp = Path(__file__).resolve().parent.parent / "zakoni" / "z1090.html"
content = fp.read_text(encoding="utf-8")
prefix = get_prefix(fp)
active = get_active(fp)
header = build_header(prefix, active)
footer = build_footer(prefix)

content = re.sub(
    r'<div class="topbar clearfix">.*?<!-- end header -->',
    header,
    content,
    count=1,
    flags=re.DOTALL,
)

idx = content.find('<footer class="footer">')
if idx != -1:
    tail = """
  <div class="dmtop">Scroll to Top</div>

  <script src="../lib/jquery/jquery.min.js"></script>
  <script src="../lib/bootstrap/js/bootstrap.min.js"></script>
  <script src="../lib/php-mail-form/validate.js"></script>
  <script src="../lib/prettyphoto/js/prettyphoto.js"></script>
  <script src="../lib/isotope/isotope.min.js"></script>
  <script src="../lib/hover/hoverdir.js"></script>
  <script src="../lib/hover/hoverex.min.js"></script>
  <script src="../lib/unveil-effects/unveil-effects.js"></script>
  <script src="../lib/owl-carousel/owl-carousel.js"></script>
  <script src="../lib/jetmenu/jetmenu.js"></script>
  <script src="../lib/animate-enhanced/animate-enhanced.min.js"></script>
  <script src="../lib/jigowatt/jigowatt.js"></script>
  <script src="../lib/easypiechart/easypiechart.min.js"></script>
  <script src="../js/layout.js"></script>
  <script src="../js/main.js"></script>

</body>
</html>
"""
    content = content[:idx] + footer + tail

content = ensure_layout_css(content, prefix)
content = ensure_layout_js(content, prefix)
fp.write_text(content, encoding="utf-8")
print("Fixed z1090.html")
