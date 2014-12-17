
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:strip-space elements="*"/>
    <xsl:variable name="characters-insert-space">0123456789abcdefghijklmnopqrstuvwxyz</xsl:variable>
    <xsl:variable name="symbols-skip-insert-space">,.;:)(</xsl:variable>

    <xsl:template match="/">
        <xsl:apply-templates select="act"/>
    </xsl:template>

    <xsl:template match="act">
        <div class="contents">
            <xsl:apply-templates select="./body/prov|./body/part"/>
        </div>
    </xsl:template>

    <xsl:template match="part[@toc]">
        <li>
            <a>
              <xsl:attribute name="href">#<xsl:value-of select="@id"/>
            </xsl:attribute>                 
            <span class="part-label">Part <span class="number"><xsl:value-of select="./label"/>&#160;</span><xsl:value-of select="./heading"/></span>
            </a>
            <xsl:apply-templates select="./subpart|./crosshead|./prov"/>
        </li>
    </xsl:template>

    <xsl:template match="subpart[@toc]">
        <li>
            <a>
              <xsl:attribute name="href">#<xsl:value-of select="@id"/>
            </xsl:attribute>                 
            <span class="subart-label">Subpart <span class="number"><xsl:value-of select="./label"/>&#160;</span><xsl:value-of select="./heading"/></span>
            </a>
            <xsl:apply-templates select="./crosshead|./prov"/>

        </li>
    </xsl:template>

    <xsl:template match="crosshead">
            <a>
              <xsl:attribute name="href">#<xsl:value-of select="@id"/>
                </xsl:attribute>     
            <span class="crosshead"><xsl:value-of select="."/></span>
            </a>
            <xsl:apply-templates select="./prov"/>
    </xsl:template>

    <xsl:template match="prov[@toc]">
        <li>
            <a>
              <xsl:attribute name="href">#<xsl:value-of select="@id"/>
            </xsl:attribute>
            <span class="prov-label"><span class="number"><xsl:value-of select="./label"/>&#160;</span><xsl:value-of select="./heading"/></span>
            </a>     
        </li>
    </xsl:template>



</xsl:stylesheet>